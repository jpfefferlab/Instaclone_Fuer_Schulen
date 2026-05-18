import base64
import binascii
import re
from curses.ascii import isblank
import uuid

from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
from django.core.validators import FileExtensionValidator
from django.db import connection, models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

import user.models as user_models
from util import image_utils

# Create your models here.

ACTION = [("following", "following"), ("like", "like"), ("comment", "comment")]


def _tenant_schema_name():
    return getattr(connection, "schema_name", None) or "public"


def post_content_upload_path(instance, filename):
    extension = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    return f"{_tenant_schema_name()}/posts/{uuid.uuid4().hex}.{extension}"


def story_content_upload_path(instance, filename):
    extension = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    return f"{_tenant_schema_name()}/stories/{uuid.uuid4().hex}.{extension}"


class Post(models.Model):
    creator = models.ForeignKey(
        User,
        related_name="post_set",
        on_delete=models.CASCADE,
        verbose_name=_("creator"),
    )
    content_upload = models.FileField(
        blank=True,
        null=True,
        max_length=255,
        upload_to=post_content_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png"])],
        verbose_name=_("image_upload"),
    )
    content_preview = models.TextField(_("content_preview"), blank=True)
    caption = models.TextField(_("caption"))
    hashtags = models.ManyToManyField(
        "post.Hashtag",
        related_name="post_hashtags",
        blank=True,
        verbose_name=_("hashtags"),
    )
    updated_on = models.DateTimeField(_("update_date"), blank=True, null=True)
    created_on = models.DateTimeField(_("created_on"), default=timezone.now)

    @property
    def content(self):
        """Return the S3 URL of the uploaded image (API backward compatibility)."""
        if self.content_upload:
            try:
                return self.content_upload.url
            except Exception:
                return ""
        return ""

    def save(self, *args, **kwargs):
        if self.content_upload:
            try:
                self.content_upload.seek(0)
            except Exception:
                pass
            self.content_preview = image_utils.save_image_as_base64(
                self.content_upload, 80, 80
            )

        super(Post, self).save(*args, **kwargs)

        if self.caption:
            hashtag_list = re.findall(r"#\w+", self.caption)
            if hashtag_list:
                for hashtag in hashtag_list:
                    hashtag_object, _ = Hashtag.objects.get_or_create(name=hashtag)
                    self.hashtags.add(hashtag_object)

    def __str__(self):
        return self.creator.username

    class Meta:
        # Beitrag
        verbose_name = _("post_singular")
        verbose_name_plural = _("post_plural")

# Popularity model to track like and comment counts for each post, updated whenever a like or comment is created.
# This is necessary for faster feed queries
class Popularity(models.Model):
    post = models.OneToOneField(Post,
                                related_name="popularity",
                                on_delete=models.CASCADE)
    like_count = models.PositiveIntegerField(_("like_count"), default=0)
    comment_count = models.PositiveIntegerField(_("comment_count"), default=0)

    updated_at = models.DateTimeField(_("updated_at"), auto_now=True)

class Advertisement(Post):
    url = models.URLField()
    gender = models.TextField(_("gender"), null=True)
    target_age_low = models.PositiveIntegerField(_("target_age_low"), default=0)
    target_age_high = models.PositiveIntegerField(_("target_age_high"), default=1000)
    target_age_none = models.BooleanField(_("target_age_none"), default=False)
    interests = models.TextField(_("interests"))
    no_interests = models.BooleanField(_("no interests"), default=False)
    keyword = models.TextField(_("keyword"), null=True, blank=True)

    class Meta:
        verbose_name = _("advertisement_singular")
        verbose_name_plural = _("advertisement_plural")


class ImageTag(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    # Coordinates are normalized, to fit each image.
    x = models.FloatField()
    y = models.FloatField()

    class Meta:
        verbose_name = _("image_tag_singular")
        verbose_name_plural = _("image_tag_plural")


class Story(models.Model):
    creator = models.ForeignKey(
        User,
        related_name="story_set",
        on_delete=models.CASCADE,
        verbose_name=_("creator"),
    )
    content_upload = models.FileField(
        blank=True,
        null=True,
        max_length=255,
        upload_to=story_content_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png"])],
        verbose_name=_("image_upload"),
    )
    created_on = models.DateTimeField(_("created_on"), default=timezone.now)

    @property
    def content(self):
        """Return the S3 URL of the uploaded image (API backward compatibility)."""
        if self.content_upload:
            try:
                return self.content_upload.url
            except Exception:
                return ""
        return ""

    def __str__(self):
        return self.creator.username

    class Meta:
        verbose_name = "Story"
        verbose_name_plural = "Stories"


class StoryView(models.Model):
    story = models.ForeignKey(Story, related_name="view_set", on_delete=models.CASCADE)
    user = models.ForeignKey(
        User,
        related_name="viewed_story_set",
        on_delete=models.CASCADE,
        verbose_name=_("creator"),
    )

    class Meta:
        unique_together = [("story", "user")]
        # Story Ansicht
        verbose_name = _("story_view_singular")
        verbose_name_plural = _("story_view_plural")


class Like(models.Model):
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, verbose_name=_("post_singular")
    )
    creator = models.ForeignKey(
        User,
        related_name="like_set",
        on_delete=models.CASCADE,
        verbose_name=_("creator"),
    )
    created_on = models.DateTimeField(_("created_on"), default=timezone.now)

    class Meta:
        unique_together = [("creator", "post")]
        # Gefällt
        verbose_name = _("like_singular")
        verbose_name_plural = _("like_plural")


class Comment(models.Model):
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, verbose_name=_("post_singular")
    )
    creator = models.ForeignKey(
        User,
        related_name="comment_set",
        on_delete=models.CASCADE,
        verbose_name=_("creator"),
    )
    content = models.TextField(_("comment_content"))
    created_on = models.DateTimeField(_("created_on"), default=timezone.now)

    class Meta:
        verbose_name = _("comment_singular")
        verbose_name_plural = _("comment_plural")


class Hashtag(models.Model):
    name = models.CharField(max_length=500, blank=False, unique=True)

    def __str__(self):
        return self.name

    def related_posts(self):
        return Post.objects.filter(hashtags__id=self.pk)

    class Meta:
        verbose_name = "Hashtag"
        verbose_name_plural = "Hashtags"


class Action(models.Model):
    creator = models.ForeignKey(
        User,
        related_name="actions",
        on_delete=models.CASCADE,
        verbose_name=_("creator"),
    )
    target_user = models.ForeignKey(
        User,
        related_name="received_actions",
        on_delete=models.CASCADE,
        verbose_name=_("target_user"),
    )
    post = models.ForeignKey(
        Post,
        related_name="actions",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_("post_singular"),
    )
    action_type = models.CharField(_("action_type"), max_length=255, choices=ACTION)
    created_on = models.DateTimeField(_("created_on"), auto_now_add=True)

    class Meta:
        verbose_name = _("action_singular")
        verbose_name_plural = _("action_plural")

    def __str__(self):
        return self.action_type


@receiver(post_save, sender=Like)
def create_like_action(sender, instance, created, **kwargs):
    if created:
        Action.objects.create(
            post=instance.post,
            creator=instance.creator,
            target_user=instance.post.creator,
            action_type="like"
        )


@receiver(post_save, sender=Comment)
def create_comment_action(sender, instance, created, **kwargs):
    if created:
        Action.objects.create(
            post=instance.post,
            creator=instance.creator,
            target_user=instance.post.creator,
            action_type="comment"
        )


@receiver(post_save, sender=user_models.Following)
def create_following_action(sender, instance, created, **kwargs):
    if created:
        Action.objects.create(
            creator=instance.user,
            target_user=instance.following_user,
            action_type="following"
        )
