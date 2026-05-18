from django.db import transaction
from django.db.models import Q
from django_tenants.utils import tenant_context

from user.models import User
from post.models import Like, Action, Post
from post.services.edge_rank_metadata_precompute import increment_user_affinity_like_count, \
    increment_post_popularity_like_count, decrement_post_popularity_like_count, decrement_user_affinity_like_count

# Important to wrap this in a transaction, because we want to make sure that the like creation and the ranking metadata updates are atomic
@transaction.atomic
def create_like(user: User, post: Post, tenant):
    with tenant_context(tenant):
        like, created = Like.objects.get_or_create(
            creator=user,
            post=post
        )

        # ranking metadata is updated via signal in post/signals.py

        # like action is created via signal in post/signals.py

        return like, created

@transaction.atomic
def delete_like(like: Like, tenant):
    with tenant_context(tenant):

        deleted_count, _ = Like.objects.filter(pk=like.pk).delete()

        # ranking metadata is updated via signal in post/signals.py

        # like action is deleted via signal in post/signals.py

        return bool(deleted_count)

