from django.db import transaction
from django.db.models import Q
from django_tenants.utils import tenant_context

from user.models import User, Following
from post.models import Like, Action, Post
from post.services.edge_rank_metadata_precompute import increment_user_affinity_like_count, \
    increment_post_popularity_like_count, decrement_post_popularity_like_count, decrement_user_affinity_like_count, \
    add_user_affinity_following, remove_user_affinity_following


@transaction.atomic
def create_following(user: User, following_user: User, tenant):
    with tenant_context(tenant):
        following, created = Following.objects.get_or_create(
            user=user,
            following_user=following_user
        )

        # following action is created via signal in user/models.py

        # ranking metadata is updated via signal in user/signals.py

        return following, created

@transaction.atomic
def delete_following(following: Following, tenant):
    with tenant_context(tenant):

        # ranking metadata is updated via signal in user/signals.py

        # following action is deleted via signal in user/signals.py

        following.delete()
