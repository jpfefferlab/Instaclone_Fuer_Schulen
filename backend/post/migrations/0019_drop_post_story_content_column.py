# Generated 2026-04-23
#
# Now that all images are stored in S3 via content_upload (added in 0017/0018)
# and the API returns the S3 URL via content_upload.url, the legacy `content`
# TextField (which held raw base64 data or a mirrored S3 URL) is no longer needed.
#
# This migration drops the column from both post_post and post_story.
#
# Non-reversible: reversing would re-add an empty TextField but cannot
# restore any data.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("post", "0018_story_content_upload_and_migrate_images_to_s3"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="post",
            name="content",
        ),
        migrations.RemoveField(
            model_name="story",
            name="content",
        ),
    ]
