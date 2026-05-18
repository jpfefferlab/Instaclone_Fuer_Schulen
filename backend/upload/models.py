from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


# Create your models here.

class Upload(models.Model):
    users = models.FileField(_("users_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                             blank=True,
                             help_text=_("upload_users_help"))
    posts = models.FileField(_("posts_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                             blank=True,
                             help_text=_("upload_posts_help"))
    advertisements = models.FileField(_("ads_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                      blank=True,
                                      help_text=_("upload_ads_help"))
    stories = models.FileField(_("stories_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                               blank=True,
                               help_text=_("upload_stories_help"))
    likes = models.FileField(_("likes_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                             blank=True,
                             help_text=_("upload_likes_help"))
    comments = models.FileField(_("comments_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_comments_help"))
    sections = models.FileField(_("sections_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_sections_help"))
    exercises = models.FileField(_("exercises_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_exercises_help"))
    tasks = models.FileField(_("tasks_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_tasks_help"))
    multipleChoiceOptions = models.FileField(_("multipleChoiceOptions_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_multipleChoiceOptions_help"))
    points = models.FileField(_("points_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_points_help"))
    features = models.FileField(_("features_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_features_help"))
    userFeatures = models.FileField(_("userFeatures_file"), validators=[FileExtensionValidator(allowed_extensions=['csv'])],
                                blank=True,
                                help_text=_("upload_userFeatures_help"))
    images = models.FileField(_("images_file"), validators=[FileExtensionValidator(allowed_extensions=['zip'])],
                              blank=True,
                              help_text=_("upload_images_help"))

    class Meta:
        verbose_name = "Upload"
        verbose_name_plural = "Uploads"
