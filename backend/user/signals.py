from django.contrib.auth.models import User
from django.db.models import Q
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from post.models import Action
from post.services.edge_rank_metadata_precompute import add_user_affinity_following, remove_user_affinity_following
from user import models as user_models
from post import models as post_models

@receiver(post_save, sender=User)
def create_user_models(sender, instance, created, **kwargs):
    """Creates default related models (Profile, Setting, History) when a User is created."""
    if created:
        user_models.Profile.objects.create(user=instance)
        user_models.Setting.objects.create(user=instance)
        user_models.History.objects.create(user=instance)

@receiver(post_save, sender=post_models.Post)
def update_last_post(sender, instance, created, **kwargs):
    """Tracks the last post created by the user."""
    if created:
        user_models.History.objects.update_or_create(
            user=instance.creator,
            defaults={"last_post": instance.created_on}
        )


@receiver(post_save, sender=post_models.Story)
def update_last_story(sender, instance, created, **kwargs):
    """Tracks the last story created by the user."""
    if created:
        user_models.History.objects.update_or_create(
            user=instance.creator,
            defaults={"last_story": instance.created_on}
        )

@receiver(post_delete, sender=User)
def delete_user_signal_clean_up_actions_and_ranking_metadata(sender, instance, **kwargs):
    # find all posts of the user and delete them, which will also delete all related actions, likes, comments.
    # precomputed ranking metadata is updated via the delete post signal in post/signals.py,
    # likes, comments and follows are deleted via signal cascade, so their respective signals will also be triggered to update the ranking metadata
    for post in post_models.Post.objects.filter(creator_id=instance.id).all():
        post.delete()

# Following Signals
@receiver(post_save, sender=user_models.Following)
def create_following_action(sender, instance, created, **kwargs):
    if created:
        Action.objects.create(
            creator=instance.user,
            target_user=instance.following_user,
            action_type="following"
        )

        add_user_affinity_following(from_user=instance.user, to_user=instance.following_user)

@receiver(post_delete, sender=user_models.Following)
def delete_following_signal_clean_up_actions_and_ranking_metadata(sender, instance, **kwargs):
    remove_user_affinity_following(instance.user, instance.following_user)

    Action.objects.filter(
        Q(creator_id=instance.user.id, target_user_id=instance.following_user.id),
        action_type="following"
    ).delete()

