from django.db.models.signals import pre_save, post_save
from django.core.exceptions import ObjectDoesNotExist
from django.dispatch import receiver

from workbook import models as workbook_models
from post import models as post_models
from user import models as user_models

# Signals for tracking interactive task progress depending on type
@receiver(post_save, sender=post_models.Post)
def track_post_creation(sender, instance, created, **kwargs):
    if created:
        submissions = workbook_models.InteractiveSubmission.objects.filter(
            user=instance.creator,
            action_type='CREATE_POST',
            correct=False,
        )
        for submission in submissions:
            submission.current_count += 1
            if submission.is_solved():
                submission.correct = True
                submission.reviewed = True
            submission.save()

@receiver(post_save, sender=post_models.Like)
def track_like_action(sender, instance, created, **kwargs):
    if created:
        submissions = workbook_models.InteractiveSubmission.objects.filter(
            user=instance.creator,
            action_type='LIKE_POST',
            correct=False,
        )
        for submission in submissions:
            submission.current_count += 1
            if submission.is_solved():
                submission.correct = True
                submission.reviewed = True
            submission.save()

@receiver(post_save, sender=post_models.Comment)
def track_comment_action(sender, instance, created, **kwargs):
    if created:
        submissions = workbook_models.InteractiveSubmission.objects.filter(
            user=instance.creator,
            action_type='COMMENT_POST',
            correct=False,
        )
        for submission in submissions:
            submission.current_count += 1
            if submission.is_solved():
                submission.correct = True
                submission.reviewed = True
            submission.save()

@receiver(post_save, sender=post_models.Story)
def track_story_creation(sender, instance, created, **kwargs):
    if created:
        submissions = workbook_models.InteractiveSubmission.objects.filter(
            user=instance.creator,
            action_type='CREATE_STORY',
            correct=False,
        )
        for submission in submissions:
            submission.current_count += 1
            if submission.is_solved():
                submission.correct = True
                submission.reviewed = True
            submission.save()

@receiver(post_save, sender=post_models.Advertisement)
def track_advertisement_creation(sender, instance, created, **kwargs):
    if created:
        submissions = workbook_models.InteractiveSubmission.objects.filter(
            user=instance.creator,
            action_type='CREATE_ADVERTISEMENT',
            correct=False,
        )
        for submission in submissions:
            submission.current_count += 1
            if submission.is_solved():
                submission.correct = True
                submission.reviewed = True
            submission.save()

@receiver(post_save, sender=user_models.Following)
def track_follow_action(sender, instance, created, **kwargs):
    if created:
        submissions = workbook_models.InteractiveSubmission.objects.filter(
            user=instance.user,
            action_type='FOLLOW',
            correct=False,
        )
        for submission in submissions:
            submission.current_count += 1
            if submission.is_solved():
                submission.correct = True
                submission.reviewed = True
            submission.save()

@receiver(pre_save, sender=user_models.Profile)
def track_profile_update(sender, instance, **kwargs):
    # Check if this is an update to an existing profile
    try:
        old_instance = user_models.Profile.objects.get(pk=instance.pk)
    except ObjectDoesNotExist:
        return

    # Fields to track for changes
    # Add any other fields you might want to track
    fields_to_track = ["user", "bio", "interests"]
    field_updated = any(getattr(old_instance, field) != getattr(instance, field) for field in fields_to_track)

    if field_updated:
        # Only trigger the update if a tracked field was changed
        submissions = workbook_models.InteractiveSubmission.objects.filter(
            user=instance.user,
            action_type='EDIT_PROFILE',
            correct=False,
        )
        for submission in submissions:
            submission.current_count += 1
            if submission.is_solved():
                submission.correct = True
                submission.reviewed = True
            submission.save()
