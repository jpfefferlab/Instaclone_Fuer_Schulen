from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from post import models as post_models


# Create your models here.

class ReportPost(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("reporter"))
    post = models.ForeignKey(post_models.Post, on_delete=models.CASCADE, verbose_name=_("post"))
    created_on = models.DateTimeField(_("created_on"), default=timezone.now)

    class Meta:
        verbose_name = _("report_singular")
        verbose_name_plural = _("report_plural")
        unique_together = ("reporter", "post")
