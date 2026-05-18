from django.contrib import admin
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rewards import models as rewards_models

@admin.register(rewards_models.Points)
class UserPointsAdmin(admin.ModelAdmin):
    list_display = ('user', 'points_balance', 'total_tasks', 'tasks_completed', 'points_earned', 'points_spent')
    list_filter = ('user',)
    search_fields = ('user__username',)

    def get_inline_instances(self, request, obj=None):
        """Show inlines if object exists."""
        if obj:
            return super().get_inline_instances(request, obj)
        return []

    # Read-only fields and computed fields
    readonly_fields = ('user', 'total_tasks', 'tasks_completed', 'points_earned', 'points_spent',)

    # Optional: Make fields read-only for updating points and tasks, if necessary
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ('total_tasks', 'tasks_completed', 'points_earned', 'points_spent',)
        return []

@admin.register(rewards_models.Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'cost')
    search_fields = ('name',)
    fields = ('name', 'cost', 'image_upload', 'image_data')

@admin.register(rewards_models.UserFeature)
class UserFeatureAdmin(admin.ModelAdmin):
    list_display = ('user', 'feature', 'is_unlocked', 'unlocked_at')
    list_filter = ('user', 'feature')
    search_fields = ('user__username', 'feature__name')
    actions = ['unlock_feature', 'lock_feature']

    def unlock_feature(self, request, queryset):
        """Unlock selected UserFeature instances."""
        updated_count = queryset.update(is_unlocked=True, unlocked_at=timezone.now())
        self.message_user(request, _(f"{updated_count} features unlocked."))

    unlock_feature.short_description = _("Unlock selected features")

    def lock_feature(self, request, queryset):
        """Lock selected UserFeature instances."""
        updated_count = queryset.update(is_unlocked=False, unlocked_at=None)
        self.message_user(request, _(f"{updated_count} features locked."))

    lock_feature.short_description = _("Lock selected features")
