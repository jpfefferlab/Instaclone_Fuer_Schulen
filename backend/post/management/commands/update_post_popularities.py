from django.core.management import BaseCommand
from django.db import transaction
from django.db.models import Count, F, Window
from django.db.models.functions import RowNumber

from post.models import Action, Popularity, Like, Comment, Advertisement, Post
from user.models import Affinity, Following


# Command to re-compute post popularity metadata based on user interactions (likes, comments) and update the database accordingly.
#
# python manage.py tenant_command update_post_popularities --schema=<schema_name>
class Command(BaseCommand):
    help = 'Re-compute post popularity metadata based on user interactions for every post'

    def add_arguments(self, parser):
        pass


    def handle(self, *args, **options):
        """
            For each post, compute:
                - like_count: number of "like" actions on the post
                - comment_count: number of "comment" actions on the post

            Note: this will update the Popularity entry for all posts, even those with no interactions (they will get 0 counts).
        """
        with transaction.atomic():
            # Delete all existing popularity entries
            Popularity.objects.all().delete()

            # Compute like and comment counts for each post
            like_counts = {
                row["post_id"]: row["action_count"]
                for row in Like.objects.values("post_id").annotate(action_count=Count("id"))
            }
            comment_counts = {
                row["post_id"]: row["action_count"]
                for row in Comment.objects.values("post_id").annotate(action_count=Count("id"))
            }

            # Update or create Popularity entries
            affected_post_ids = set(like_counts.keys()) | set(comment_counts.keys())

            # Get advertisment post ids to exclude them from popularity updates, as they are not relevant for the feed ranking and would skew the counts.
            advertisement_post_ids = set(
                Post.objects.filter(advertisement__isnull=False).values_list("id", flat=True)
            )

            for post_id in affected_post_ids:
                # exclude ads
                if post_id in advertisement_post_ids:
                    continue

                popularity_entry, _ = Popularity.objects.get_or_create(
                    post_id=post_id,
                    defaults={"like_count": 0, "comment_count": 0},
                )
                popularity_entry.like_count = like_counts.get(post_id, 0)
                popularity_entry.comment_count = comment_counts.get(post_id, 0)
                popularity_entry.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully updated popularity metadata for {len(affected_post_ids)} posts"
                )
            )
