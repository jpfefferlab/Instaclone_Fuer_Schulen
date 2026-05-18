from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User

from rewards import models as rewards_models
from workbook import models as workbook_models


@receiver(post_save, sender=User)
def initialize_user_rewards(sender, instance, created, **kwargs):
    """Creates Points and UserFeature entries when a new user is created."""
    if created:
        # Create the UserPoints object with default values
        rewards_models.Points.objects.create(user=instance)

        # Create UserFeature entries for all available features
        features = rewards_models.Feature.objects.all()
        for feature in features:
            rewards_models.UserFeature.objects.get_or_create(user=instance, feature=feature)

@receiver(post_save, sender=rewards_models.Feature)
def create_user_feature(sender, instance, created, **kwargs):
    """When a new feature is created, assigns it as UserFeature to all existing users."""
    if created:
        users = User.objects.all()

        for user in users:
            rewards_models.UserFeature.objects.get_or_create(user=user, feature=instance)

@receiver(post_save, sender=rewards_models.Points)
def initialize_points(sender, instance, created, **kwargs):
    """Initializes the total task amount when a Points object is created."""
    if created:
        instance.total_tasks = workbook_models.Task.objects.exclude(type='CONTENT').count()
        instance.save()

@receiver(post_save, sender=workbook_models.Task)
def update_total_tasks_on_create(sender, instance, created, **kwargs):
    if created and instance.type != 'CONTENT':
        # Update total_tasks for all Points instances
        # Count how many tasks (excluding CONTENT type) exist
        total_tasks = workbook_models.Task.objects.exclude(type='CONTENT').count()

        for points in rewards_models.Points.objects.all():
            points.total_tasks = total_tasks
            points.save()

@receiver(post_delete, sender=workbook_models.Task)
def update_total_tasks_on_delete(sender, instance, **kwargs):
    if instance.type != 'CONTENT':
        # Recalculate total tasks after deletion
        total_tasks = workbook_models.Task.objects.exclude(type='CONTENT').count()

        for points in rewards_models.Points.objects.all():
            points.total_tasks = total_tasks
            points.save()
