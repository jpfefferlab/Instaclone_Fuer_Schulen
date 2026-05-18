from django.contrib.admin.views.decorators import staff_member_required
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View

from post import models as post_models
from user import models as user_models
from workbook import models as workbook_models
from rewards import models as rewards_models
from util.export_util import export_csv


def export_users(writer):
    writer.writerow(['USER_ID', 'Username', 'Name', 'Surname'])
    users = user_models.User.objects.all()
    for user in users:
        writer.writerow([user.id, user.username, user.first_name, user.last_name])


def export_profiles(writer):
    writer.writerow(['USER_ID', 'Bio', 'Age', 'Gender', 'Interests'])
    profiles = user_models.Profile.objects.all()
    for profile in profiles:
        writer.writerow([profile.user_id, profile.bio, profile.age, profile.gender, profile.interests])


def export_followers(writer):
    writer.writerow(['USER_ID', 'Followed USER_ID'])
    followers = user_models.Following.objects.filter(created_on__lte=timezone.now())
    for follower in followers:
        writer.writerow([follower.user_id, follower.following_user_id])


def export_posts(writer):
    writer.writerow(['POST_ID', 'USER_ID', 'Caption', 'Creation Date', 'Update Date', 'Hashtags'])
    posts = post_models.Post.objects.filter(advertisement__isnull=True, created_on__lte=timezone.now())
    for post in posts:
        # filter hashtags by current posts id, then generate comma seperated string with names
        hashtag_names = [htag.name for htag in post.hashtags.all()]
        hashtags_string = ', '.join(hashtag_names)
        writer.writerow([post.id, post.creator_id, post.caption, post.created_on, post.updated_on, hashtags_string])


def export_ads(writer):
    writer.writerow(
        ['POST_ID', 'USER_ID', 'Caption', 'Creation Date', 'Update Date', 'Hashtags', 'URL', 'Gender', 'Interests',
         'No Interests', 'Keyword', 'Upper Target Age', 'Lower Target Age', 'No Age'])
    ads = post_models.Advertisement.objects.filter(created_on__lte=timezone.now())
    for ad in ads:
        hashtag_names = [htag.name for htag in ad.hashtags.all()]
        hashtags_string = ', '.join(hashtag_names)
        writer.writerow([ad.id, ad.creator_id, ad.caption, ad.created_on, ad.updated_on, hashtags_string, ad.url,
                         ad.gender, ad.interests, ad.no_interests, ad.keyword, ad.target_age_low,
                         ad.target_age_high,
                         ad.target_age_none])


def export_stories(writer):
    writer.writerow(['USER_ID', 'POST_ID', 'Creation Date'])
    stories = post_models.Story.objects.filter(created_on__lte=timezone.now())
    for story in stories:
        writer.writerow([story.creator_id, story.id, story.created_on])


def export_comments(writer):
    writer.writerow(['USER_ID', 'POST_ID', 'Comment', 'Creation Date'])
    comments = post_models.Comment.objects.filter(created_on__lte=timezone.now())
    for comment in comments:
        writer.writerow([comment.creator_id, comment.post_id, comment.content, comment.created_on])


def export_likes(writer):
    writer.writerow(['USER_ID', 'POST_ID', 'Creation Date'])
    likes = post_models.Like.objects.filter(created_on__lte=timezone.now())
    for like in likes:
        writer.writerow([like.creator_id, like.post_id, like.created_on])


def export_sections(writer):
    """Exports Section model data to CSV."""
    writer.writerow(['Section Title', 'Order'])
    sections = workbook_models.Section.objects.all()
    for section in sections:
        writer.writerow([
            section.title,
            section.order
        ])


def export_exercises(writer):
    """Exports Exercise model data to CSV."""
    writer.writerow(['Section Title', 'Exercise Title', 'Order'])
    exercises = workbook_models.Exercise.objects.select_related('section').all()
    for exercise in exercises:
        writer.writerow([
            exercise.section.title if exercise.section else "",
            exercise.title,
            exercise.order
        ])


def export_tasks(writer):
    """Exports Task model data to CSV."""
    writer.writerow(['Exercise Title', 'Task Title', 'Type', 'Upper Text', 'Lower Text', 'Points', 'Order', 'Minimum Answer Length', 'Correct Answer', 'Action Type', 'Target Count'])
    tasks = workbook_models.Task.objects.select_related('exercise').all()
    for task in tasks:
        writer.writerow([
            task.exercise.title if task.exercise else "",
            task.title,
            task.get_type_display().upper(),
            task.upper_text,
            task.lower_text,
            task.points,
            task.order,
            task.minimum_answer_length,
            task.correct_answer,
            task.action_type,
            task.target_count
        ])


def export_multiple_choice_options(writer):
    """Exports MultipleChoiceOption model data to CSV."""
    writer.writerow(['Task', 'Option Text', 'Is Correct'])
    options = workbook_models.MultipleChoiceOption.objects.select_related('task').all()
    for option in options:
        writer.writerow([
            option.task.title if option.task else "",
            option.option,
            option.is_correct
        ])


def export_points(writer):
    """Exports Points model data to CSV."""
    writer.writerow(['Points_ID', 'User', 'Balance', 'Earned', 'Spent', 'Tasks Completed', 'Total Tasks'])
    points = rewards_models.Points.objects.select_related('user').all()
    for user_points in points:
        writer.writerow([
            user_points.id,
            user_points.user.username if user_points.user else "",
            user_points.points_balance,
            user_points.points_earned,
            user_points.points_spent,
            user_points.tasks_completed,
            user_points.total_tasks
        ])


def export_features(writer):
    """Exports Feature model data to CSV."""
    writer.writerow(['Feature_ID', 'Feature Name', 'Feature Cost'])
    features = rewards_models.Feature.objects.all()
    for feature in features:
        writer.writerow([
            feature.id,
            feature.name,
            feature.cost,
        ])


def export_user_features(writer):
    """Exports User Feature model data to CSV."""
    writer.writerow(['User_Feature_ID', 'User', 'Feature Name', 'Is Unlocked', 'Unlocked At'])
    user_features = rewards_models.UserFeature.objects.select_related('user', 'feature').all()
    for user_feature in user_features:
        writer.writerow([
            user_feature.id,
            user_feature.user.username if user_feature.user else "",
            user_feature.feature.name if user_feature.feature else "",
            user_feature.is_unlocked,
            user_feature.unlocked_at,
        ])

# Create your views here.

@method_decorator(staff_member_required, name='dispatch')
class ExportUsersView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('users', export_users)


@method_decorator(staff_member_required, name='dispatch')
class ExportProfilesView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('profiles', export_profiles)


@method_decorator(staff_member_required, name='dispatch')
class ExportFollowersView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('followers', export_followers)


@method_decorator(staff_member_required, name='dispatch')
class ExportPostsView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('posts', export_posts)


@method_decorator(staff_member_required, name='dispatch')
class ExportAdsView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('advertisements', export_ads)


@method_decorator(staff_member_required, name='dispatch')
class ExportStoriesView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('stories', export_stories)


@method_decorator(staff_member_required, name='dispatch')
class ExportCommentsView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('comments', export_comments)


@method_decorator(staff_member_required, name='dispatch')
class ExportLikesView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('likes', export_likes)


@method_decorator(staff_member_required, name='dispatch')
class ExportSectionsView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('sections', export_sections)


@method_decorator(staff_member_required, name='dispatch')
class ExportExercisesView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('exercises', export_exercises)


@method_decorator(staff_member_required, name='dispatch')
class ExportTasksView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('tasks', export_tasks)


@method_decorator(staff_member_required, name='dispatch')
class ExportMultipleChoiceOptionsView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('multiple_choice_options', export_multiple_choice_options)


@method_decorator(staff_member_required, name='dispatch')
class ExportPointsView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('points', export_points)


@method_decorator(staff_member_required, name='dispatch')
class ExportFeaturesView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('features', export_features)


@method_decorator(staff_member_required, name='dispatch')
class ExportUserFeaturesView(View):
    def get(self, request, *args, **kwargs):
        return export_csv('user_features', export_user_features)
