import datetime
import json

from django.db import transaction
from django.db.models import Count, Q, F, OuterRef, Value, Subquery, FloatField, Sum, Case, When, IntegerField, \
    Expression, ExpressionWrapper, CharField, Window, QuerySet, BooleanField, FilteredRelation
from django.db.models.functions import Power, Now, Extract, Coalesce, Floor
from django.db.models.functions.window import RowNumber
from rest_framework import filters, viewsets, mixins, permissions, status
from rest_framework.generics import DestroyAPIView, UpdateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.utils import timezone
from django_tenants.utils import tenant_context

import util.user_checks
from post import models as post_models
from post import serializers as post_serializers
from post.models import ImageTag, Action, Advertisement, Post
from post.services.comment import delete_comment, create_comment
from post.services.like import create_like, delete_like
from post.services.post import delete_post
from user import models as user_models
from user.models import Setting
from util.user_checks import is_teacher_or_staff

# Create your views here.
class NewsFeedViewPaginator(PageNumberPagination):
    page_size = 5
    page_query_param = "page"


class ProfilePostsViewPaginator(PageNumberPagination):
    page_size = 12
    page_query_param = "page"


class ActionViewPaginator(PageNumberPagination):
    page_size = 5
    page_query_param = "page"


class NewsfeedViewSet(viewsets.GenericViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                      mixins.DestroyModelMixin):
    # Don't filter creation date here, as it is not refreshed every single call
    queryset = post_models.Post.objects.filter(advertisement__isnull=True).prefetch_related('imagetag_set', 'comment_set', 'like_set')
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = NewsFeedViewPaginator
    serializer_class = post_serializers.NewsfeedSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['caption']
    ADVERTISEMENT_EVERY_N_POSTS = 5

    def get_feed_union_queryset(self):
        # ads are already filtered out above, so we can directly filter by creation date here
        post_queryset = self.queryset.filter(created_on__lte=timezone.now())

        # feed queryset
        requesting_user = self.request.user
        user_settings = requesting_user.settings
        order_posts_by_field = F("created_on").desc()
        order_ads_by_field = F("created_on").desc()

        # annotate
        if user_settings.newsfeed_algorithm == Setting.NewsfeedAlgorithm.ALGORITHM_1:
            order_posts_by_field = F("created_on").desc()
        elif user_settings.newsfeed_algorithm == Setting.NewsfeedAlgorithm.ALGORITHM_2:
            like_count_subquery = post_models.Like.objects.filter(
                post_id=OuterRef('id'),
                created_on__lte=timezone.now()
            ).values('post_id').annotate(count=Count('id')).values('count')

            post_queryset = post_queryset.annotate(
                like_count=Coalesce(Subquery(like_count_subquery, output_field=IntegerField()), Value(0))
            )
            order_posts_by_field = F("like_count").desc()
        # Algorithm 3
        elif user_settings.newsfeed_algorithm == Setting.NewsfeedAlgorithm.ALGORITHM_3:
            post_queryset = self.annotate_edge_rank_metadata(post_queryset, requesting_user, self.request.tenant)
            order_posts_by_field = F("edge_rank_score").desc()

        # ordering
        post_queryset.order_by(order_posts_by_field)

        # merge with advertisements
        advertisement_queryset = self.get_advertisement_queryset(requesting_user)

        # this only returns values("object_id", "item_type", "slot")
        return self.get_merged_post_and_ad_queryset_ids(post_queryset,
                                                        advertisement_queryset,
                                                        order_posts_by_field,
                                                        order_ads_by_field,
                                                        requesting_user)

    def list(self, request, *args, **kwargs):
        # paginate the feed queryset of post and advertisement IDs
        #   Caveat: this does not yet contain the actual post and advertisement data, but only the IDs and types,
        #   so we can fetch them in bulk and maintain the correct pagination with the union query
        feed_rows = self.paginate_queryset(self.get_feed_union_queryset())

        # Here is the first time that the lazy query gets evaluated and the posts/ads materialized

        # Fetch posts and advertisements based on the IDs in feed_rows
        post_ids = [row['object_id'] for row in feed_rows if row['item_type'] == 'post']
        ad_ids = [row['object_id'] for row in feed_rows if row['item_type'] == 'advertisement']

        if request.user.settings.newsfeed_xray_mode:
            # not ideal but necessary for x-ray mode
            post_qs = self.annotate_edge_rank_metadata(self.queryset, request.user, self.request.tenant)
        else:
            post_qs = self.queryset

        posts_by_id = post_qs.in_bulk(post_ids)
        ads_by_id = Advertisement.objects.in_bulk(ad_ids)

        # Construct the final feed list with serialized data
        final_feed = [
            posts_by_id[row['object_id']] if row['item_type'] == 'post' else ads_by_id[row['object_id']]
            for row in feed_rows
        ]

        return self.get_paginated_response(self.get_serializer(final_feed, many=True).data)

    @staticmethod
    def annotate_edge_rank_metadata(qs: QuerySet, user, tenant):
        settings = user.settings

        with tenant_context(tenant):
            # Exclude own posts if the setting is disabled
            if not settings.newsfeed_show_own_posts:
                qs = qs.exclude(creator_id=user.id)

            # Filter only posts from followed users if the setting is enabled
            if settings.newsfeed_followed_only_mode:
                qs = qs.filter(
                    creator__in=user.followings.values_list("following_user_id", flat=True)
                )

            # JOIN-based affinity lookup:
            # Post.creator -> User.targeted_affinities (Affinity.to_user related_name)
            # filtered to the requesting user as from_user.
            qs = qs.annotate(
                request_affinity=FilteredRelation(
                    "creator__targeted_affinities",
                    condition=Q(creator__targeted_affinities__from_user_id=user.id),
                )
            )


            # Popularity lookup from precomputed metadata table (post.Popularity)
            qs = qs.annotate(
                request_popularity=FilteredRelation("popularity")
            )

            # Compute time factor
            time_diff = Extract(Now() - F("created_on"), 'epoch')
            time_factor = Power(
                Value(1 - settings.newsfeed_time_decay_base_factor),
                (time_diff / Value(180) + Value(1)) / Value(180),
            )

            # Final query set with annotations and edge rank calculation
            qs = qs.annotate(
                # Affinity
                affinity_like_count=Coalesce(
                    F("request_affinity__affinity_like_count"),
                    Value(0),
                    output_field=IntegerField(),
                ),
                affinity_comment_count=Coalesce(
                    F("request_affinity__affinity_comment_count"),
                    Value(0),
                    output_field=IntegerField(),
                ),
                affinity_is_from_followed_user=Coalesce(
                    F("request_affinity__follows"),
                    Value(False),
                    output_field=BooleanField(),
                ),

                # popularity
                like_count=Coalesce(F("request_popularity__like_count"), Value(0), output_field=IntegerField()),
                comment_count=Coalesce(F("request_popularity__comment_count"), Value(0), output_field=IntegerField()),
            ).annotate(
                affinity_score=ExpressionWrapper(
                    1
                    + F("affinity_like_count") * settings.newsfeed_affinity_like_weight
                    + F("affinity_comment_count") * settings.newsfeed_affinity_comment_weight
                    + Case(
                        When(affinity_is_from_followed_user__gt=0,
                             then=Value(settings.newsfeed_affinity_follower_weight)),
                        default=Value(0),
                        output_field=FloatField()
                    ),
                    output_field=FloatField()
                ),
                popularity_score=ExpressionWrapper(
                    1
                    + F("like_count") * settings.newsfeed_post_like_weight
                    + F("comment_count") * settings.newsfeed_post_comment_weight,
                    output_field=FloatField()
                ),
                time_factor_score=time_factor,
            ).annotate(
                edge_rank_score=F("affinity_score") * F("popularity_score") * F("time_factor_score")
            )

            return qs

    @staticmethod
    def get_advertisement_queryset(user):
        try:
            profile = user_models.Profile.objects.get(user=user)
            age_query = Q(target_age_low__lte=profile.age,
                          target_age_high__gte=profile.age) if profile.age is not None else Q(target_age_none=True)

            interest_query = Q()
            if profile.interests is not None:
                interest_list = profile.interests.split(",")
                interest_query = Q(interests__contains=interest_list[0])
                for interest in interest_list[1:]:
                    interest_query |= Q(interests__contains=interest)

            gender_query = Q(gender__icontains=profile.gender) | Q(gender__isnull=True)

            # keyword_query = Q(keyword__isnull=True) | Q(keyword__in=profile.bio.lower().split())

            pre_filtered_ads = post_models.Advertisement.objects.filter(
                age_query & interest_query & gender_query
            )

            return pre_filtered_ads

        except user_models.Profile.DoesNotExist:
            return post_models.Advertisement.objects.filter(created_on__lte=timezone.now())

    def get_merged_post_and_ad_queryset_ids(self, posts_qs, ads_qs,
                                             order_posts_by_field=F("edge_rank_score").desc(),
                                             order_ads_by_field=F("created_on").desc(),
                                             requesting_user=None):
        user_settings = requesting_user.settings

        if (user_settings.newsfeed_algorithm == Setting.NewsfeedAlgorithm.ALGORITHM_1 or
                user_settings.newsfeed_algorithm == Setting.NewsfeedAlgorithm.ALGORITHM_2):
            ad_frequency = self.ADVERTISEMENT_EVERY_N_POSTS
        else:
            ad_frequency = user_settings.newsfeed_advertisement_frequency

        # only posts and no ads
        if ad_frequency < 1:
            posts_qs = self.annotate_post_qs_with_slots(posts_qs, order_posts_by_field, F("row_number"))
            return posts_qs.order_by("slot")

        # only ads
        if ad_frequency == 1:
            advertisement_qs = self.annotate_advertisement_qs_with_slots(ads_qs, order_ads_by_field, F("row_number"))
            return advertisement_qs.order_by("slot")

        # ads and posts for ad_frequency > 1
        post_slot_expression = F("row_number") + Floor((F("row_number") -  1) / Value(ad_frequency - 1))
        advertisement_slot_expression = F("row_number") * Value(ad_frequency)
        posts_qs = self.annotate_post_qs_with_slots(posts_qs, order_posts_by_field, post_slot_expression)
        ads_qs = self.annotate_advertisement_qs_with_slots(ads_qs, order_ads_by_field, advertisement_slot_expression)

        return posts_qs.union(ads_qs).order_by("slot")

    @staticmethod
    def annotate_post_qs_with_slots(posts_qs, order_by_field, slot_expression):
        return posts_qs.annotate(
            row_number=Window(
                expression=RowNumber(),
                order_by=order_by_field
            ),
            item_type=Value("post", output_field=CharField()),
            object_id=F("id"),
            slot=ExpressionWrapper(
                slot_expression,
                output_field=IntegerField()
            )
        ).values("object_id", "item_type", "slot")

    @staticmethod
    def annotate_advertisement_qs_with_slots(advertisement_qs, order_by_field, slot_expression):
        return advertisement_qs.annotate(
            row_number=Window(
                expression=RowNumber(),
                order_by=order_by_field
            ),
            item_type=Value("advertisement", output_field=CharField()),
            object_id=F("id"),
            slot=ExpressionWrapper(
                slot_expression,
                output_field=IntegerField()
            )
        ).values("object_id", "item_type", "slot")


class PostViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin
):
    queryset = post_models.Post.objects.filter(advertisement__isnull=True)
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]
    pagination_class = ProfilePostsViewPaginator
    serializer_class = post_serializers.PostSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['caption']

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id", None)

        queryset = super().get_queryset().filter(creator=user_id, created_on__lte=timezone.now())
        queryset = queryset.prefetch_related('imagetag_set', 'comment_set', 'like_set')
        queryset = queryset.order_by("-created_on")

        return queryset

    def create(self, request, *args, **kwargs):
        post_serializer = self.get_serializer(data=request.data)
        if post_serializer.is_valid():
            # Save post_instance and commit immediately
            with transaction.atomic():
                post_serializer.save()
            post_instance = post_serializer.instance

            # Now, proceed with other atomic operations
            with transaction.atomic():
                tags_json = request.data.get('tags', [])
                tags = json.loads(tags_json)
                for tag in tags:
                    tag_instance = ImageTag(
                        post_id=post_instance.id,
                        user_id=tag['user_id'],
                        x=tag['x'],
                        y=tag['y']
                    )
                    tag_instance.save()

            return Response(post_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(post_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Hint: another delete apparently happens in PostModifyAPIView for post deletion
    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if post.creator == request.user or is_teacher_or_staff(request.user):
            delete_post(post, request.user, tenant=request.tenant)
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(status=status.HTTP_403_FORBIDDEN,
                        data={"detail": "You do not have permission to delete this post."})

class PostModifyAPIView(UpdateAPIView, DestroyAPIView):
    queryset = post_models.Post.objects.all()
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]
    serializer_class = post_serializers.PostSerializer

    def delete(self, request, *args, **kwargs):
        post = self.get_object()
        if post.creator == request.user or is_teacher_or_staff(request.user):
            delete_post(post, request.user, tenant=request.tenant)

            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(status=status.HTTP_403_FORBIDDEN,
                        data={"detail": "You do not have permission to delete this post."})

    def partial_update(self, request, *args, **kwargs):
        post = self.get_object()
        post.updated_on = timezone.now()
        if request.user == post.creator:
            serializer = self.get_serializer(post, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            with transaction.atomic():
                tags_json = request.data.get('tags', [])
                tags = json.loads(tags_json)
                # Remove all existing tags and create new ones
                ImageTag.objects.filter(post=post).delete()
                for tag in tags:
                    tag_instance = ImageTag(
                        post_id=post.id,
                        user_id=tag['user_id'],
                        x=tag['x'],
                        y=tag['y']
                    )
                    tag_instance.save()
            return Response(serializer.data)
        return Response({"detail": "You do not have permission to perform this action."},
                        status=status.HTTP_400_BAD_REQUEST)

class AdvertisementViewSet(viewsets.GenericViewSet, mixins.CreateModelMixin, mixins.ListModelMixin,
                           mixins.RetrieveModelMixin):
    queryset = post_models.Advertisement.objects.all()
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]
    pagination_class = ProfilePostsViewPaginator
    serializer_class = post_serializers.AdvertisementSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        queryset = super().get_queryset().filter(created_on__lte=timezone.now())
        if user_id is not None:
            queryset = queryset.filter(creator=user_id)
        queryset = queryset.prefetch_related('imagetag_set', 'comment_set', 'like_set')
        queryset = queryset.order_by("-created_on")

        return queryset


class StoryViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin
):
    queryset = post_models.Story.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = post_serializers.StorySerializer

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id", None)
        if user_id:
            return self.queryset.filter(creator__id=user_id, created_on__lte=timezone.now(),
                                        created_on__gte=timezone.now() - timezone.timedelta(days=1)).order_by(
                "created_on")
        return self.queryset.filter(created_on__lte=timezone.now(),
                                    created_on__gte=timezone.now() - timezone.timedelta(days=1)).order_by("created_on")
        # return self.queryset.filter(Q(user=self.request.user)|Q(user__in=self.request.user.followings)).distinct()


class StoryViewsViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
):
    queryset = post_models.StoryView.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = post_serializers.StoryViewSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id', None)
        if user_id:
            return self.queryset.filter(user_id=user_id)
        return self.queryset


class LikeViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin
):
    queryset = post_models.Like.objects.all()
    serializer_class = post_serializers.LikeSerializer
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]

    def get_queryset(self):
        if self.request.query_params.get('post_id'):
            return self.queryset.filter(post_id=self.request.query_params.get('post_id'),
                                        created_on__lte=timezone.now())
        return self.queryset.filter(created_on__lte=timezone.now())

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = serializer.validated_data["post"]

        like, created = create_like(
            tenant=request.tenant,
            user=request.user,
            post=post,
        )

        return Response(
            self.get_serializer(like).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        like = self.get_object()
        delete_like(like, tenant=request.tenant)

        return Response(status=status.HTTP_204_NO_CONTENT)

class CommentViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin
):
    queryset = post_models.Comment.objects.all()
    serializer_class = post_serializers.CommentSerializer
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]

    def get_queryset(self):
        return self.queryset.filter(created_on__lte=timezone.now())

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        headers = self.get_success_headers(serializer.data)

        post = serializer.validated_data["post"]

        comment = create_comment(
            tenant=request.tenant,
            user=request.user,
            post=post,
            content=serializer.validated_data["content"]
        )

        return Response(self.get_serializer(comment).data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if request.user == comment.post.creator or request.user == comment.creator or is_teacher_or_staff(request.user):
            delete_comment(comment, tenant=request.tenant)
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(status=status.HTTP_403_FORBIDDEN)


class HashtagViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin
):
    queryset = post_models.Hashtag.objects.all()
    serializer_class = post_serializers.HashtagSerializer
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class ActionViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin
):
    queryset = post_models.Action.objects.all()
    serializer_class = post_serializers.ActionSerializer
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]
    pagination_class = ActionViewPaginator

    def get_queryset(self):
        return self.queryset.filter(target_user=self.request.user).order_by("-created_on")


class ImageTagViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = ImageTag.objects.all()
    serializer_class = post_serializers.ImageTagSerializer
    permission_classes = [permissions.IsAuthenticated, util.user_checks.RestrictedUser]

    def get_serializer(self, *args, **kwargs):
        if "data" in kwargs and isinstance(kwargs["data"], list):
            kwargs["many"] = True
        return super().get_serializer(*args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        tag = self.get_object()
        if tag.post.creator != request.user and tag.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN,
                            data={"detail": "You do not have permission to delete this tag."})
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
