from django.contrib.auth.models import User
from rest_framework import serializers

from post import serializers as post_serializers
from user import serializers as user_serializers
from . import models as report_models


class ReportPostSerializer(serializers.ModelSerializer):
    post = post_serializers.PostFlatSerializer()
    reporter = user_serializers.UserDetailFlatSerializer()

    class Meta:
        model = report_models.ReportPost
        fields = ["id", "reporter", "post", "created_on"]


class CreatePostReportSerializer(serializers.ModelSerializer):
    reporter_id = serializers.IntegerField()
    post_id = serializers.IntegerField()

    class Meta:
        model = report_models.ReportPost
        fields = ["reporter_id", "post_id"]


class RestrictedUserSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField()

    class Meta:
        model = User
