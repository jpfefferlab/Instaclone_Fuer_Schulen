from allauth.account.models import EmailAddress
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from rest_framework.authtoken.models import TokenProxy

from user import models as user_models

# Register your models here.
admin.site.unregister(User)
admin.site.unregister(TokenProxy)
admin.site.unregister(EmailAddress)


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'is_active', 'is_staff')
    list_filter = ('username',)
    exclude = ('email',)
    fieldsets = (
        ('Personal info', {'fields': ('username', 'password', 'first_name', 'last_name')}),
        ('Important dates', {'fields': ('date_joined',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'groups')}),
    )


@admin.register(user_models.Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'has_profile_picture', 'bio', 'gender')

    class Meta:
        model = user_models.Profile

    @admin.display(empty_value="False")
    def has_profile_picture(self, obj):
        return obj.picture is not None

    has_profile_picture.short_description = _("admin_user_picture")


@admin.register(user_models.Following)
class FollowingAdmin(admin.ModelAdmin):
    list_display = ('user', 'following_user', 'notification_allowed',)

    class Meta:
        model = user_models.Following


@admin.register(user_models.Setting)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'comment_allowed', 'allow_tags_from',)
    actions = ("export_setting_as_csv",)

    class Meta:
        model = user_models.Setting


@admin.register(user_models.History)
class HistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'last_post', 'last_story')
    list_filter = ('user',)
    search_fields = ('user__username',)

    class Meta:
        model = user_models.History


admin.site.register(User, CustomUserAdmin)
