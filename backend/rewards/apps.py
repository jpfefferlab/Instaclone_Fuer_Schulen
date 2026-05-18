from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

class RewardsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rewards'
    verbose_name = _("reward_plural")

    def ready(self):
        # Import the signals to connect them
        import rewards.signals
