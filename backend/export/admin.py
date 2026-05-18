from django.contrib import admin

import export.models


@admin.register(export.models.Export)
class ExportAdmin(admin.ModelAdmin):
    change_form_template = 'admin/export.html'
    change_list_template = 'admin/export.html'
