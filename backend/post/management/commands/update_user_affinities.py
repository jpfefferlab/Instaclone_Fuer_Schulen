from django.core.management import BaseCommand
from django.db import transaction
from django.db.models import Count, F, Window
from django.db.models.functions import RowNumber

from post.models import Action, Like, Comment
from user.models import Affinity, Following


# Command to re-compute user affinity metadata based on their interactions (likes, comments, follows) and update the database accordingly.
#
# python manage.py tenant_command update_user_affinities --schema=<schema_name>
class Command(BaseCommand):
    help = 'Re-compute user affinity metadata based on their interactions for every user'

    def add_arguments(self, parser):
        pass

    def _window_counts_for_action(self, action_type):
        """
        Returns rows:
        {creator_id, target_user_id, action_count}
        one row per (creator_id, target_user_id) pair.
        """
        if action_type == "like":
            objects = Like.objects
        elif action_type == "comment":
            objects = Comment.objects
        else:
            raise ValueError(f"Unsupported action type: {action_type}")

        query = objects.filter(post__advertisement__isnull=True).annotate(
            target_user_id=F("post__creator_id")
        )

        query = self._count_actions_for_users(query)

        return query


    def _count_actions_for_users(self, queryset):
        """
        Returns rows:
        {user_id, post__author_id, like_count}
        one row per (user_id, post__author_id) pair.
        Excludes likes on advertisements.
        """
        return (
            queryset
            .annotate(
                action_count=Window(
                    expression=Count("id"),
                    partition_by=[F("creator_id"), F("target_user_id")],
                ),
                row_number=Window(
                    expression=RowNumber(),
                    partition_by=[F("creator_id"), F("target_user_id")],
                    order_by=F("id").asc(),
                ),
            )
            .filter(row_number=1)
            .values("creator_id", "target_user_id", "action_count")
        )

    def handle(self, *args, **options):
        """
            For each user pair (from_user_id, to_user_id), compute:
                - affinity_like_count: number of "like" actions from from_user_id to to_user_id
                - affinity_comment_count: number of "comment" actions from from_user_id to to_user_id
                - follows: whether from_user_id currently follows to_user_id

            Note: this does only create an affinity entry for pairs with at least one interaction or follow.
                    Pairs with no interactions/follows will not have an affinity entry.
        """
        like_rows = list(self._window_counts_for_action("like"))
        comment_rows = list(self._window_counts_for_action("comment"))
        follow_pairs = set(
            Following.objects.values_list("user_id", "following_user_id")
        )

        # Merge all metrics by pair key: (from_user_id, to_user_id)
        merged = {}

        for row in like_rows:
            key = (row["creator_id"], row["target_user_id"])
            merged.setdefault(key, {"like": 0, "comment": 0, "follows": False})
            merged[key]["like"] = row["action_count"]

        for row in comment_rows:
            key = (row["creator_id"], row["target_user_id"])
            merged.setdefault(key, {"like": 0, "comment": 0, "follows": False})
            merged[key]["comment"] = row["action_count"]

        for key in follow_pairs:
            merged.setdefault(key, {"like": 0, "comment": 0, "follows": False})
            merged[key]["follows"] = True

        rows = [
            Affinity(
                from_user_id=from_user_id,
                to_user_id=to_user_id,
                affinity_like_count=values["like"],
                affinity_comment_count=values["comment"],
                follows=values["follows"],
            )
            for (from_user_id, to_user_id), values in merged.items()
        ]

        with transaction.atomic():
            Affinity.objects.all().delete()

            if rows:
                Affinity.objects.bulk_create(
                    rows,
                    update_conflicts=True,
                    unique_fields=["from_user", "to_user"],
                    update_fields=[
                        "affinity_like_count",
                        "affinity_comment_count",
                        "follows",
                    ],
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated affinity for {len(rows)} user pairs "
                f"(likes={len(like_rows)}, comments={len(comment_rows)}, follows={len(follow_pairs)})."
            )
        )




