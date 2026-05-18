from django.contrib.auth.models import User
from rest_framework import serializers

from user import models as user_models
from util import user_checks


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = user_models.Profile
        fields = "__all__"
        extra_kwargs = {
            "user": {"required": False}
        }


class UserDetailFlatSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ["id", "username", "profile", "first_name", "last_name"]


class UserFollowingSerializer(serializers.ModelSerializer):
    class Meta:
        model = user_models.Following
        fields = "__all__"

    def validate(self, attrs):
        request = self.context.get("request")
        attrs["user"] = request.user
        return attrs


class UserFollowingFlatSerializer(serializers.ModelSerializer):
    following_user = UserDetailFlatSerializer()

    class Meta:
        model = user_models.Following
        fields = "__all__"


class UserFollowerFlatSerializer(serializers.ModelSerializer):
    user = UserDetailFlatSerializer()

    class Meta:
        model = user_models.Following
        fields = "__all__"


class UserSettingsSerializer(serializers.ModelSerializer):
    comment_allowed = serializers.BooleanField(required=False)
    is_private_account = serializers.BooleanField(required=False)
    allow_tags_from = serializers.CharField(max_length=10, required=False)
    allow_mentions_from = serializers.CharField(max_length=10, required=False)

    class Meta:
        model = user_models.Setting
        fields = "__all__"

    def validate(self, attrs):
        request = self.context.get("request")
        attrs["user"] = request.user
        return attrs


class UserHistorySerializer(serializers.ModelSerializer):
    last_post = serializers.DateTimeField(required=False)
    last_story = serializers.DateTimeField(required=False)

    class Meta:
        model = user_models.History
        fields = ["id", "user", "last_post", "last_story"]
        read_only_fields = ["user"]

    def validate(self, attrs):
        request = self.context.get("request")
        attrs["user"] = request.user
        return attrs


class UserDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()
    follower_count = serializers.SerializerMethodField(required=False)
    following_count = serializers.SerializerMethodField(required=False)
    is_authenticated = serializers.SerializerMethodField()
    followings = UserFollowingFlatSerializer(many=True, required=False)
    followers = UserFollowerFlatSerializer(many=True, required=False)
    settings = UserSettingsSerializer(required=False)
    post_count = serializers.SerializerMethodField(required=False)
    report_view = serializers.SerializerMethodField()
    restricted_view = serializers.SerializerMethodField()

    """
    viewed_stories = post_serializers.StoryViewSerializer(
        source="viewed_story_set", read_only=True, many=True
    )
    """

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name",
            "last_name", "profile", "followers",
            "followings", "follower_count",
            "following_count", "is_authenticated", "settings", "post_count", "report_view", "restricted_view"
        ]
        read_only_fields = ["followers", "followings", "follower_count", "followings_count", "settings", "report_view",
                            "restricted_view"]

    def get_follower_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.followings.count()

    def get_is_authenticated(self, obj):
        return obj.is_authenticated

    def get_post_count(self, obj):
        return obj.post_set.filter(advertisement__isnull=True).count()

    def get_report_view(self, obj):
        return user_checks.is_teacher_or_staff(obj)

    def get_restricted_view(self, obj):
        return user_checks.is_restricted_user(obj)

    def update(self, instance, validated_data):
        user = self.context.get("request").user
        user.first_name = validated_data["first_name"]
        user.last_name = validated_data["last_name"]
        user.save()

        profile, created = user_models.Profile.objects.get_or_create(user=user)
        profile.picture = validated_data["profile"].get("picture", None)
        profile.background_image = validated_data["profile"].get("background_image", None)
        profile.bio = validated_data["profile"].get("bio", None)
        profile.age = validated_data["profile"].get("age", None)
        profile.gender = validated_data["profile"].get("gender", None)
        profile.interests = validated_data["profile"].get("interests", None)
        profile.save()
        return user
