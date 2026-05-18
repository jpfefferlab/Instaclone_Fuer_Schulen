from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from util import image_utils

class Points(models.Model):
    """Tracks a user's points and related activity in the app."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="points", verbose_name=_("user_singular"))
    points_balance = models.PositiveIntegerField(default=0, verbose_name=_("points_balance"))  # Current points balance
    points_earned = models.PositiveIntegerField(default=0, verbose_name=_("points_earned"))  # All-time points earned
    points_spent = models.PositiveIntegerField(default=0, verbose_name=_("points_spent"))  # Total points spent
    tasks_completed = models.PositiveIntegerField(default=0, verbose_name=_("tasks_completed"))  # Number of tasks completed
    total_tasks = models.PositiveIntegerField(default=0, verbose_name=_("total_tasks")) # Number of existing tasks

    def add_points(self, amount):
        """Adds points and updates the total earned."""
        self.points_balance += amount
        self.points_earned += amount
        self.save()

    def spend_points(self, amount):
        """Deducts points and updates the total spent."""
        if self.points_balance >= amount:
            self.points_balance -= amount
            self.points_spent += amount
            self.save()
        else:
            raise ValueError(_("Not enough points to spend."))

    def __str__(self):
        points_label = _("point_plural")
        return f"{self.user.username} - {self.points_balance} {points_label}"

    class Meta:
        verbose_name = _("point_plural")
        verbose_name_plural = _("point_plural")

class Feature(models.Model):
    """Model representing an unlockable or purchasable feature for the user."""

    FEATURE_TYPES = [
        ('EDIT_AVATAR', 'Edit Avatar'),
        ('UNLIMITED_POSTS', 'Unlimited Posts'),
        ('CHANGE_BACKGROUND_IMAGE', 'Change Background Image')
    ]

    name = models.CharField(unique=True, choices=FEATURE_TYPES, verbose_name=_("feature_name"))
    image_upload = models.FileField(blank=True, null=True, validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])], verbose_name=_("image_upload"), help_text=_("upload_feature_image_help"))
    image_data = models.TextField(blank=True, null=True, verbose_name=_("feature_image")) # Base64 encoded image data
    cost = models.PositiveIntegerField(default=0, verbose_name=_("feature_cost"))  # Cost to unlock the feature

    def clean(self):
        """Custom validation for image file size and type."""
        max_file_size = 5 * 1024 * 1024
        if self.image_upload and self.image_upload.size > max_file_size:
            raise ValidationError(_("The uploaded image file size cannot exceed 5MB."))

    def save(self, *args, **kwargs):
        """Process and save the uploaded image as base64."""
        if self.image_upload:
            # Compress and convert the image to base64
            self.image_data = image_utils.save_image_as_base64(self.image_upload, 800, 800)
            # Clear the image upload field, since no longer needed
            self.image_upload = None

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("feature_singular")
        verbose_name_plural = _("feature_plural")


class UserFeature(models.Model):
    """Tracks which features each user has unlocked."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_features", verbose_name=_("user_singular"))
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, verbose_name = _("feature_singular"))
    is_unlocked = models.BooleanField(default=False, verbose_name=_("is_unlocked"))
    unlocked_at = models.DateTimeField(blank=True, null=True, verbose_name=_("unlocked_at"))

    def __str__(self):
        return f"{self.user.username} - {self.feature.name}"

    class Meta:
        unique_together = ("user", "feature")  # Ensures a feature can't be unlocked twice if one-time
        verbose_name = _("user_feature_singular")
        verbose_name_plural = _("user_feature_plural")
