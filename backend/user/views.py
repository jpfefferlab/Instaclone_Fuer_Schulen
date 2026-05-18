from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import filters
from rest_framework import viewsets, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from post.models import Action
from user import models as user_models
from user import serializers as user_serializers
from user.services.following import create_following, delete_following
from util import user_checks
from util.user_checks import is_teacher_or_staff

MAX_NUMBER_OF_SUGGESTIONS = 5


class UserProfileViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin
):
    queryset = User.objects.all()
    serializer_class = user_serializers.UserDetailSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = [filters.SearchFilter]
    search_fields = ['username']

    def get_queryset(self):
        return self.queryset.annotate(
            follower_count=Count('followers'),
            following_count=Count('followings'),
            post_count=Count('post_set', filter=~Q(post_set__advertisement__isnull=False))
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return user_serializers.UserDetailFlatSerializer
        return self.serializer_class

    def retrieve(self, request, pk=None, **kwargs):
        user = get_object_or_404(self.queryset, username=pk)
        serializer = self.serializer_class(user)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def me(self, request):
        current_user = get_object_or_404(User, pk=request.user.pk)
        serializer = self.serializer_class(current_user)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def suggestions(self, request):
        excluded_user_ids = list(
            user_models.Following.objects.filter(user_id=request.user).values_list('following_user_id',
                                                                                   flat=True))
        excluded_user_ids.append(request.user.id)
        users = User.objects.exclude(id__in=excluded_user_ids)[:MAX_NUMBER_OF_SUGGESTIONS]

        serializer = user_serializers.UserDetailFlatSerializer(users, many=True)
        return Response(serializer.data)


class UserFollowingViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet
):
    queryset = user_models.Following.objects.all()
    serializer_class = user_serializers.UserFollowingSerializer
    permission_classes = [permissions.IsAuthenticated, user_checks.RestrictedUser]

    def _user_to_flat(self, user_id):
        user_object = User.objects.get(id=user_id)
        flat_user = user_serializers.UserDetailFlatSerializer(instance=user_object).data
        return flat_user

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        headers = self.get_success_headers(serializer.data)

        following_user = serializer.validated_data["following_user"]

        following, created = create_following(
            tenant=request.tenant,
            user=request.user,
            following_user=following_user
        )

        return Response(self.get_serializer(following).data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        following = self.get_object()

        if request.user == following.user:
            delete_following(following=following, tenant=request.tenant)
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(status=status.HTTP_403_FORBIDDEN)


class UserSettingsViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin
):
    queryset = user_models.Setting.objects.all()
    serializer_class = user_serializers.UserSettingsSerializer
    permission_classes = (permissions.IsAuthenticated,)


class UserHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = user_serializers.UserHistorySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return user_models.History.objects.filter(user=self.request.user)
