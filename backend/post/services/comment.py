from django.db import transaction
from django.db.models import Q
from django_tenants.utils import tenant_context

from user.models import User
from post.models import Like, Action, Post, Comment
from post.services.edge_rank_metadata_precompute import increment_post_popularity_comment_count, increment_user_affinity_comment_count, \
    decrement_post_popularity_comment_count, decrement_user_affinity_comment_count


@transaction.atomic
def create_comment(user: User, post: Post, content: str, tenant):
    with tenant_context(tenant):
        comment = Comment.objects.create(
            creator=user,
            post=post,
            content=content
        )

        # ranking metadata is updated via signal in post/signals.py

        # note: comment action is created via signal in post/signals.py


        return comment

@transaction.atomic
def delete_comment(comment: Comment, tenant):
    with tenant_context(tenant):
        deleted_count, _ = Comment.objects.filter(pk=comment.pk).delete()

        # ranking metadata is updated via signal in post/signals.py

        # comment action is deleted via signal in post/signals.py

        return bool(deleted_count)

