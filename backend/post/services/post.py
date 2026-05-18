from django.db import transaction
from django_tenants.utils import tenant_context

from post.models import Post
from user.models import User

@transaction.atomic
def delete_post(post: Post, user: User, tenant):
    with tenant_context(tenant):
        # like and comment ranking metadata will be updated in signal in post/signals.py when the like and comment objects are deleted

        # actions related to the post will be deleted in signal in post/signals.py

        post.delete()
