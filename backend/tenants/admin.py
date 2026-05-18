# Register your models here.
from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from django_tenants.utils import tenant_context

from tenants.models import Client, Domain
from user.management.util import get_or_create_teacher_user_group, create_teacher_user_and_add_to_group


@admin.register(Client)
class ClientAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'created_on')
    actions = ("create_teacher_user",)

    def create_teacher_user(self, request, queryset):
        for tenant in queryset:
            with tenant_context(tenant):
                teacher_user_group = get_or_create_teacher_user_group()
                create_teacher_user_and_add_to_group(teacher_user_group)


admin.site.register(Domain)
