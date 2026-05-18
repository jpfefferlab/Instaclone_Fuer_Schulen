"""InstaClone URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls')
"""
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import set_language
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter

from analytic import views as analytic_views
from post import views as post_views
from report import views as moderation_views
from user import views as user_views
from workbook import views as workbook_views
from rewards import views as rewards_views

# API Routes
router = DefaultRouter()

router.register(r'users', user_views.UserProfileViewSet, basename='users')
router.register(r'user-settings', user_views.UserSettingsViewSet, basename='user-settings')
router.register(r'user-history', user_views.UserHistoryViewSet, basename='user-history')
router.register(r'followings', user_views.UserFollowingViewSet, basename='followings')
router.register(r'posts', post_views.PostViewSet, basename='posts')
router.register(r'feed', post_views.NewsfeedViewSet, basename='feed')
router.register(r'advertisements', post_views.AdvertisementViewSet, basename='advertisements')
router.register(r'stories', post_views.StoryViewSet, basename='stories')
router.register(r'story-views', post_views.StoryViewsViewSet, basename='story-views')
router.register(r'hashtags', post_views.HashtagViewSet, basename='hashtags')
router.register(r'likes', post_views.LikeViewSet, basename='likes')
router.register(r'comments', post_views.CommentViewSet, basename='comments')
router.register(r'actions', post_views.ActionViewSet, basename='actions')
router.register(r'image-tags', post_views.ImageTagViewSet, basename='image-tags')
router.register(r'post-reports', moderation_views.ReportPostViewSet, basename='post-reports')
router.register(r'restricted-users', moderation_views.RestrictedUserViewSet, basename='restricted-users')
# Workbook related endpoints
router.register(r'workbook/sections', workbook_views.SectionViewSet, basename='workbook-sections')
router.register(r'workbook/submissions/multiple-choice', workbook_views.MultipleChoiceSubmissionViewSet, basename='workbook-submissions-multiple-choice')
router.register(r'workbook/submissions/text-answer', workbook_views.TextAnswerSubmissionViewSet, basename='workbook-submissions-text-answer')
router.register(r'workbook/submissions/interactive', workbook_views.InteractiveSubmissionViewSet, basename='workbook-submissions-interactive')
router.register(r'workbook/submissions', workbook_views.SpecificSubmissionViewSet, basename='workbook-submissions')
router.register(r'workbook/user-submissions', workbook_views.UserSubmissionsViewSet, basename='workbook-user-submissions')

urlpatterns = [
    # Django admin
    path('admin/export/', include('export.urls')),
    path('admin/', admin.site.urls),
    path('i18n/setlang/', set_language, name='set_language'),
    path('', RedirectView.as_view(pattern_name='admin:index')),
    # Frontend API calls
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/analytics/', analytic_views.AnalyticsAPIView.as_view(), name='analytics'),
    path('api/posts/<int:pk>/', post_views.PostModifyAPIView.as_view(), name='post-modify'),
    path('api/workbook/exercises/<int:pk>/', workbook_views.ExerciseAPIView.as_view(), name='exercise-detail'),
    path('api/', include((router.urls, 'api'), namespace='api')),
    # Rewards related endpoints
    path('api/features/', rewards_views.FeatureListView.as_view(), name='feature-list'),
    path('api/features/unlock/', rewards_views.UnlockFeatureView.as_view(), name='unlock-feature'),
    path('api/user/features/', rewards_views.UserFeatureListView.as_view(), name='unlocked-features'),
    path('api/user/points/', rewards_views.PointsViewSet.as_view({'get': 'list'}), name='user-points'),
    path('api/add-points/', rewards_views.AddPointsView.as_view(), name='increase-points'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

admin.site.site_header = 'InstaClone Administration'
