from django.contrib.auth.models import User
from django.db.models import Q
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from post.models import Like, Action, Comment, Post
from post.services.edge_rank_metadata_precompute import decrement_post_popularity_like_count, \
    decrement_user_affinity_like_count, increment_post_popularity_like_count, increment_user_affinity_like_count, \
    decrement_user_affinity_comment_count, decrement_post_popularity_comment_count, \
    increment_post_popularity_comment_count, increment_user_affinity_comment_count
from user import models as user_models
from post import models as post_models

# are run all inside the transaction of the encapsulating service functions

# Post Signals
@receiver(post_delete, sender=Post)
def delete_post_signal_clean_up_actions_and_ranking_metadata(sender, instance, **kwargs):
    # delete all likes and comments of the post, which will also update the precomputed popularity and affinity counts
    # using the respective signals that are triggered by the delete calls below
    for like in instance.like_set.filter(creator_id=instance.creator.id).all():
        like.delete()

    for comment in instance.comment_set.filter(creator_id=instance.creator.id).all():
        comment.delete()

    # delete all actions of the post
    Action.objects.filter(post_id=instance.id, creator_id=instance.creator.id).delete()


# Like Signals
@receiver(post_save, sender=Like)
def create_like_action(sender, instance, created, **kwargs):
    if created:
        Action.objects.create(
            post=instance.post,
            creator=instance.creator,
            target_user=instance.post.creator,
            action_type="like"
        )
        # exclude ads for ranking metadata updates, as they are not relevant for the feed ranking and would skew the counts.
        if hasattr(instance.post, 'advertisement'):
            return

        increment_post_popularity_like_count(instance.post_id)
        increment_user_affinity_like_count(from_user=instance.creator, to_user=instance.post.creator)

@receiver(post_delete, sender=Like)
def delete_like_signal_clean_up_actions_and_ranking_metadata(sender, instance, **kwargs):
    # delete like action
    Action.objects.filter(
        creator_id=instance.creator_id,
        post_id=instance.post_id,
        action_type="like"
    ).delete()

    # exclude ads for ranking metadata updates, as they are not relevant for the feed ranking and would skew the counts.
    if hasattr(instance.post, 'advertisement'):
        return

    # decrement like count in popularity model
    decrement_post_popularity_like_count(instance.post_id)
    decrement_user_affinity_like_count(instance.creator, instance.post.creator)


# Comment Signals
@receiver(post_save, sender=Comment)
def create_comment_action(sender, instance, created, **kwargs):
    if created:
        Action.objects.create(
            post=instance.post,
            creator=instance.creator,
            target_user=instance.post.creator,
            action_type="comment"
        )

        # exclude ads for ranking metadata updates, as they are not relevant for the feed ranking and would skew the counts.
        if hasattr(instance.post, 'advertisement'):
            return

        increment_post_popularity_comment_count(instance.post.id)
        increment_user_affinity_comment_count(from_user=instance.creator, to_user=instance.post.creator)

@receiver(post_delete, sender=Comment)
def delete_comment_signal_clean_up_actions_and_ranking_metadata(sender, instance, **kwargs):
    # only delete one action (if multiple comments on the same post). Might delete the wrong one of the user, but there is no association possible with the comment, as there are no foreign keys.
    first_comment_action = Action.objects.filter(
        Q(creator_id=instance.creator_id,
          post_id=instance.post_id),
        action_type="comment"
    ).first()

    if first_comment_action:
        first_comment_action.delete()

    # exclude ads for ranking metadata updates, as they are not relevant for the feed ranking and would skew the counts.
    if hasattr(instance.post, 'advertisement'):
        return

    # decrement precomputed ranking metadata counts
    decrement_post_popularity_comment_count(instance.post_id)
    decrement_user_affinity_comment_count(instance.creator, instance.post.creator)