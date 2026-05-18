from django.db import transaction
from django.db.models import F, Value
from django.db.models.functions import Greatest

from post.models import Popularity
from user.models import Affinity, User

# Every helper function is wrapped in a transaction to ensure that the updates to the popularity and affinity models are atomic and consistent, even under high concurrency.
# The update_or_create method is used to either update the existing record or create a new one if it doesn't exist,
# which simplifies the logic and reduces the number of database queries needed to maintain the popularity and affinity data.


#
# Popularity updates
#

@transaction.atomic
def increment_post_popularity_like_count(post_id: int):
    Popularity.objects.update_or_create(
        post_id=post_id,
        defaults={'like_count': F('like_count') + 1},
        create_defaults={
            'like_count': 1,
            'comment_count': 0 # can be created with 0 comment count, because if a comment is already created before, the db already has this row and it will just update the like count
        }
    )


@transaction.atomic
def decrement_post_popularity_like_count(post_id: int):
    Popularity.objects.update_or_create(
        post_id=post_id,
        defaults={'like_count': Greatest(F("like_count") - 1, Value(0))},
        # should not happen
        create_defaults={
            'like_count': 0,
            'comment_count': 0
        }
    )

    # delete the popularity object if both like_count and comment_count are zero to save space
    Popularity.objects.filter(post_id=post_id, like_count=0, comment_count=0).delete()


@transaction.atomic
def increment_post_popularity_comment_count(post_id: int):
    Popularity.objects.update_or_create(
        post_id=post_id,
        defaults={'comment_count': F('comment_count') + 1},
        create_defaults={
            'like_count': 0,
            'comment_count': 1
        }
    )


@transaction.atomic
def decrement_post_popularity_comment_count(post_id: int,):
    Popularity.objects.update_or_create(
        post_id=post_id,
        defaults={'comment_count': Greatest(F("comment_count") - 1, Value(0))},
        # should not happen
        create_defaults={
            'like_count': 0,
            'comment_count': 0
        }
    )

    # delete the popularity object if both like_count and comment_count are zero to save space
    Popularity.objects.filter(post_id=post_id, like_count=0, comment_count=0).delete()


#
# Affinity updates
# allows affinity to one self (from_user = to_user)
#

# likes
@transaction.atomic
def increment_user_affinity_like_count(from_user: User, to_user: User):
    Affinity.objects.update_or_create(
        from_user=from_user,
        to_user=to_user,
        defaults={'affinity_like_count': F('affinity_like_count') + 1},
        create_defaults = {
            'affinity_like_count': 1,
            'affinity_comment_count': 0, # can be created with 0 comment count, because if a comment is already created before, the db already has this row and it will just update the like count
            'follows': False # can be created with follows False, because if a follow action is already created before, the db already has this row and it will just update the like count
        }
    )

@transaction.atomic
def decrement_user_affinity_like_count(from_user: User, to_user: User):
    Affinity.objects.update_or_create(
        from_user=from_user,
        to_user=to_user,
        defaults={'affinity_like_count': Greatest(F("affinity_like_count") - 1, Value(0))},
        # should not happen
        create_defaults={
            'affinity_like_count': 0,
            'affinity_comment_count': 0,
            'follows': False
        }
    )

    # delete the affinity object if like_count, comment_count are zero and follows is false to save space
    Affinity.objects.filter(from_user=from_user, to_user=to_user, affinity_like_count=0, affinity_comment_count=0, follows=False).delete()

# comments
@transaction.atomic
def increment_user_affinity_comment_count(from_user: User, to_user: User):
    Affinity.objects.update_or_create(
        from_user=from_user,
        to_user=to_user,
        defaults={'affinity_comment_count': F('affinity_comment_count') + 1},
        create_defaults={
            'affinity_like_count': 0,
            'affinity_comment_count': 1,
            'follows': False
        }
    )


@transaction.atomic
def decrement_user_affinity_comment_count(from_user: User, to_user: User):
    Affinity.objects.update_or_create(
        from_user=from_user,
        to_user=to_user,
        defaults={'affinity_comment_count': Greatest(F("affinity_comment_count") - 1, Value(0))},
        # should not happen
        create_defaults={
            'affinity_like_count': 0,
            'affinity_comment_count': 0,
            'follows': False
        }
    )

    # delete the affinity object if like_count, comment_count are zero and follows is false to save space
    Affinity.objects.filter(from_user=from_user, to_user=to_user, affinity_like_count=0, affinity_comment_count=0,
                            follows=False).delete()


#
# Affinity following updates
#

@transaction.atomic
def add_user_affinity_following(from_user: User, to_user: User):
    Affinity.objects.update_or_create(
        from_user=from_user,
        to_user=to_user,
        defaults={'follows': True},
        create_defaults={
            'affinity_like_count': 0,
            'affinity_comment_count': 0,
            'follows': True
        }
    )

@transaction.atomic
def remove_user_affinity_following(from_user: User, to_user: User):
    Affinity.objects.update_or_create(
        from_user=from_user,
        to_user=to_user,
        defaults={'follows': False},
        # should not happen
        create_defaults={
            'affinity_like_count': 0,
            'affinity_comment_count': 0,
            'follows': False
        }
    )

    # delete the affinity object if like_count, comment_count are zero and follows is false to save space
    Affinity.objects.filter(from_user=from_user, to_user=to_user, affinity_like_count=0, affinity_comment_count=0,
                            follows=False).delete()