from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class WorkbookConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'workbook'
    verbose_name = _("workbook")

    def ready(self):
        import workbook.signals
