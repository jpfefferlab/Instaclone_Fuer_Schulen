from django.utils import timezone
from rest_framework import serializers
from user.models import User

from rewards import models as rewards_models

class PointsSerializer(serializers.ModelSerializer):
    class Meta:
        model = rewards_models.Points
        fields = ["points_balance", "total_tasks", "tasks_completed", "points_earned", "points_spent"]

class AddPointsSerializer(serializers.Serializer):
    """Serializer to validate and process adding points."""
    amount = serializers.IntegerField(min_value=0, required=True)

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = rewards_models.Feature
        fields = ["id", "name", "cost"]

class UserFeatureSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    feature_name = serializers.CharField(source='feature.name', read_only=True)
    feature_image = serializers.SerializerMethodField('get_feature_image')
    feature_cost = serializers.IntegerField(source='feature.cost', read_only=True)

    def get_feature_image(self, obj):
        """Fetches the image data from the related Feature model."""
        if obj.feature.image_data:
            return f"data:image/jpeg;base64,{obj.feature.image_data}"
        return None

    class Meta:
        model = rewards_models.UserFeature
        fields = ["user", "feature_name", "feature_image", "feature_cost", "is_unlocked", "unlocked_at"]

class UnlockFeatureSerializer(serializers.Serializer):
    """Handles user's request to unlock a feature."""
    feature_name = serializers.CharField()

    def validate(self, data):
        user = self.context['request'].user
        feature_name = data.get('feature_name')
        feature = rewards_models.Feature.objects.filter(name=feature_name).first()

        if not feature:
            raise serializers.ValidationError("Feature not found.")

        user_feature = rewards_models.UserFeature.objects.filter(user=user, feature=feature).first()

        if not user_feature:
            raise serializers.ValidationError("UserFeature not found.")

        if user_feature.is_unlocked:
            raise serializers.ValidationError("Feature already unlocked.")

        # Check if the user has enough points to unlock the feature
        user_points = rewards_models.Points.objects.get(user=user)
        if user_points.points_balance < feature.cost:
            raise serializers.ValidationError("Not enough points to unlock this feature.")

        data['user_feature'] = user_feature
        data['user_points'] = user_points
        data['feature'] = feature

        return data

    def create(self, validated_data):
        # Retrieve instances from validated data
        user_feature = validated_data['user_feature']
        user_points = validated_data['user_points']
        feature = validated_data['feature']

        # Mark the feature as unlocked
        user_feature.is_unlocked = True
        user_feature.unlocked_at = timezone.now()
        user_feature.save()

        # Use the model method to deduct points
        try:
            user_points.spend_points(feature.cost)
        except ValueError as e:
            raise serializers.ValidationError(str(e))

        return user_feature
