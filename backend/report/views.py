from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework import permissions, status, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

import util.user_checks
from post import models as post_models
from user import models as user_models
from user import serializers as user_serializer
from user.management.util import get_or_create_restricted_user_group
from util.user_checks import is_teacher_or_staff
from . import models as report_models
from . import serializers as report_serializers
from .serializers import CreatePostReportSerializer


# Create your views here.

class ReportPostViewPaginator(PageNumberPagination):
    page_size = 9
    page_query_param = "page"


class RestrictedUserViewPaginator(PageNumberPagination):
    page_size = 9
    page_query_param = "page"


class ReportPostViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet,
                        mixins.ListModelMixin,
                        ):
    queryset = report_models.ReportPost.objects.all()
    serializer_class = report_serializers.ReportPostSerializer
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = ReportPostViewPaginator

    def get_queryset(self):
        if is_teacher_or_staff(self.request.user):
            return self.queryset.order_by('-created_on')
        return report_models.ReportPost.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = CreatePostReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reporter_id = serializer.validated_data.get('reporter_id')
        post_id = serializer.validated_data.get('post_id')
        reporter = get_object_or_404(user_models.User, id=reporter_id)
        post = get_object_or_404(post_models.Post, id=post_id)
        try:
            report_post = report_models.ReportPost(reporter=reporter, post=post)
            report_post.save()
            return Response({'message': 'Report created successfully'}, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response({'message': 'Report already exists'}, status=status.HTTP_400_BAD_REQUEST)


class RestrictedUserViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin
):
    queryset = User.objects.all()
    serializer_class = user_serializer.UserDetailFlatSerializer
    permission_classes = [permissions.IsAuthenticated, util.user_checks.TeacherOrStaff]
    pagination_class = RestrictedUserViewPaginator

    def get_queryset(self):
        restricted_group = get_or_create_restricted_user_group()
        return self.queryset.filter(groups__in=[restricted_group]).order_by("username")

    @action(detail=False, methods=['POST'])
    def restrict(self, request):
        user_id = request.data.get('user_id')
        user = get_object_or_404(User, pk=user_id)
        restricted_group = get_or_create_restricted_user_group()
        user.groups.add(restricted_group)
        user.save()
        return Response({'message': 'User has been added to the restricted group.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['POST'])
    def unrestrict(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        user = get_object_or_404(User, pk=user_id)
        restricted_group = get_or_create_restricted_user_group()
        user.groups.remove(restricted_group)
        user.save()
        return Response({'message': 'User has been removed from the restricted group.'}, status=status.HTTP_200_OK)
