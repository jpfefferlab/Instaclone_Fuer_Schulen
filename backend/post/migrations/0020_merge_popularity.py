"""
Merge migration: joins the 0017_popularity branch with the
0017_post_content_upload → 0018 → 0019 chain.

Both branches descend from 0016_alter_advertisement_keyword.
This empty merge migration makes the graph linear again.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("post", "0017_popularity"),
        ("post", "0019_drop_post_story_content_column"),
    ]

    operations = []
