from django.urls import path

from export.views import ExportPostsView, ExportCommentsView, ExportAdsView, ExportStoriesView, ExportLikesView, \
    ExportFollowersView, ExportProfilesView, ExportUsersView, ExportSectionsView, ExportExercisesView, ExportTasksView, ExportMultipleChoiceOptionsView, \
    ExportPointsView, ExportFeaturesView, ExportUserFeaturesView

app_name = 'export'

urlpatterns = [
    path('export_users/', ExportUsersView.as_view(), name='export_users'),
    path('export_profiles/', ExportProfilesView.as_view(), name='export_profiles'),
    path('export_followers/', ExportFollowersView.as_view(), name='export_followers'),
    path('export_posts/', ExportPostsView.as_view(), name='export_posts'),
    path('export_ads/', ExportAdsView.as_view(), name='export_ads'),
    path('export_stories/', ExportStoriesView.as_view(), name='export_stories'),
    path('export_comments/', ExportCommentsView.as_view(), name='export_comments'),
    path('export_likes/', ExportLikesView.as_view(), name='export_likes'),
    path('export_sections/', ExportSectionsView.as_view(), name='export_sections'),
    path('export_exercises/', ExportExercisesView.as_view(), name='export_exercises'),
    path('export_tasks/', ExportTasksView.as_view(), name='export_tasks'),
    path('export_multiple_choice_options/', ExportMultipleChoiceOptionsView.as_view(), name='export_multiple_choice_options'),
    path('export_points/', ExportPointsView.as_view(), name='export_points'),
    path('export_features/', ExportFeaturesView.as_view(), name='export_features'),
    path('export_user_features/', ExportUserFeaturesView.as_view(), name='export_user_features')

]
