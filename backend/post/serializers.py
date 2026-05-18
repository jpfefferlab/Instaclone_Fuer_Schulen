from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers

from post import models as post_models
from post.models import Advertisement
from user import serializers as user_serializers


class LikeSerializer(serializers.ModelSerializer):
    creator = user_serializers.UserDetailFlatSerializer(read_only=True)

    class Meta:
        model = post_models.Like
        fields = "__all__"
        extra_kwargs = {
            "creator": {"required": False},
        }

    def validate(self, attrs):
        request = self.context.get("request")
        attrs["creator"] = request.user
        return attrs


class CommentSerializer(serializers.ModelSerializer):
    creator = user_serializers.UserDetailFlatSerializer(read_only=True)

    class Meta:
        model = post_models.Comment
        fields = "__all__"
        extra_kwargs = {"creator": {"required": False}}

    def validate(self, attrs):
        request = self.context.get("request")
        attrs["creator"] = request.user
        return attrs


class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = post_models.Hashtag
        fields = "__all__"


class ImageTagSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = post_models.ImageTag
        fields = ("id", "username", "user_id", "x", "y")


class PostSerializer(serializers.ModelSerializer):
    creator = user_serializers.UserDetailFlatSerializer(required=False)
    likes = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    hashtags = HashtagSerializer(source="hashtag_set", read_only=True, many=True)
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField(read_only=True)
    image_tags = ImageTagSerializer(source="imagetag_set", read_only=True, many=True)

    is_from_followed_user = serializers.SerializerMethodField(
        required=False, allow_null=True
    )

    # Optional values for the newsfeed algorithm if using edge_rank
    affinity_score = serializers.SerializerMethodField(required=False, allow_null=True)
    affinity_like_count = serializers.SerializerMethodField(
        required=False, allow_null=True
    )
    affinity_comment_count = serializers.SerializerMethodField(
        required=False, allow_null=True
    )
    affinity_is_from_followed_user = serializers.SerializerMethodField(
        required=False, allow_null=True
    )
    popularity_score = serializers.SerializerMethodField(
        required=False, allow_null=True
    )
    time_factor_score = serializers.SerializerMethodField(
        required=False, allow_null=True
    )
    edge_rank_score = serializers.SerializerMethodField(required=False, allow_null=True)

    class Meta:
        model = post_models.Post
        fields = "__all__"
        extra_kwargs = {
            "creator": {"required": False},
            "content_upload": {"required": False},
        }

    def validate(self, attrs):
        request = self.context.get("request")
        attrs["creator"] = request.user
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # content is a property, not a DB field, so expose it explicitly
        data["content"] = instance.content
        return data

    def get_like_count(self, obj):
        # Use len() on the prefetched cache instead of .count() which would hit the DB.
        # The like_set is already filtered via Prefetch in the view's get_queryset().
        return len(obj.like_set.all())

    def get_comment_count(self, obj):
        # Use len() on the prefetched cache instead of .count() which would hit the DB.
        return len(obj.comment_set.all())

    def get_comments(self, obj):
        # Use .all() instead of .filter() -- the created_on filtering is already applied
        # via the Prefetch object in the view's get_queryset(). Calling .filter() here
        # would bypass the prefetch cache and issue a new DB query per post.
        comments = obj.comment_set.all()
        return CommentSerializer(comments, many=True, read_only=True).data

    def get_likes(self, obj):
        # Use .all() instead of .filter() -- same reason as get_comments above.
        likes = obj.like_set.all()
        return LikeSerializer(likes, many=True, read_only=True).data

    def get_type(self, obj):
        return "POST"

    def get_is_from_followed_user(self, obj):
        return (
            obj.is_from_followed_user if hasattr(obj, "is_from_followed_user") else None
        )

    def get_affinity_score(self, obj):
        return obj.affinity_score if hasattr(obj, "affinity_score") else None

    # How many likes has the logged-in user given the author of the post in total
    def get_affinity_like_count(self, obj):
        return obj.affinity_like_count if hasattr(obj, "affinity_like_count") else None

    # How many comments has the logged-in user given the author of the post in total
    def get_affinity_comment_count(self, obj):
        return (
            obj.affinity_comment_count
            if hasattr(obj, "affinity_comment_count")
            else None
        )

    # How many accounts has the logged-in user given
    def get_affinity_is_from_followed_user(self, obj):
        return (
            obj.affinity_is_from_followed_user
            if hasattr(obj, "affinity_is_from_followed_user")
            else None
        )

    def get_popularity_score(self, obj):
        return obj.popularity_score if hasattr(obj, "popularity_score") else None

    def get_time_factor_score(self, obj):
        return obj.time_factor_score if hasattr(obj, "time_factor_score") else None

    def get_edge_rank_score(self, obj):
        return obj.edge_rank_score if hasattr(obj, "edge_rank_score") else None


class PostPreviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = post_models.Post
        fields = ["content_preview"]


class AdvertisementSerializer(PostSerializer):
    type = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = post_models.Advertisement
        fields = "__all__"
        extra_kwargs = {
            "creator": {"required": False},
            "content_upload": {"required": False},
        }

    def get_type(self, obj):
        return "ADVERTISEMENT"


class PostFlatSerializer(serializers.ModelSerializer):
    creator = user_serializers.UserDetailFlatSerializer(required=False)

    class Meta:
        model = post_models.Post
        fields = ["id", "created_on", "creator", "caption"]


class NewsfeedSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        # Pass context (contains request, view, etc.) to the child serializers.
        # Without this, a bare PostSerializer() / AdvertisementSerializer() is created
        # per row with no context, which can also prevent proper prefetch usage.
        if isinstance(instance, Advertisement):
            return AdvertisementSerializer(context=self.context).to_representation(
                instance
            )
        else:
            return PostSerializer(context=self.context).to_representation(instance)


class StorySerializer(serializers.ModelSerializer):
    creator = user_serializers.UserDetailFlatSerializer(required=False)

    class Meta:
        model = post_models.Story
        fields = "__all__"
        extra_kwargs = {
            "creator": {"required": False},
            "content_upload": {"required": False},
        }

    def validate(self, attrs):
        request = self.context.get("request")
        attrs["creator"] = request.user
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # content is a property, not a DB field, so expose it explicitly
        data["content"] = instance.content
        return data


class StoryViewSerializer(serializers.ModelSerializer):
    story_id = serializers.PrimaryKeyRelatedField(
        source="story", queryset=post_models.Story.objects.all()
    )
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", queryset=User.objects.all()
    )

    class Meta:
        model = post_models.StoryView
        fields = ["story_id", "user_id"]


class ActionSerializer(serializers.ModelSerializer):
    creator = user_serializers.UserDetailFlatSerializer(required=False)
    post = PostPreviewSerializer(required=False)

    class Meta:
        model = post_models.Action
        fields = ["id", "action_type", "created_on", "creator", "post"]
