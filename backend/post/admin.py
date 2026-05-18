import csv
from datetime import date

from django.contrib import admin
from django.http import HttpResponse
from django.utils import timezone

from post import models as post_models


# Register your models here.


@admin.register(post_models.Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('creator', 'caption', 'hashtag_list', 'created_on')

    class Meta:
        model = post_models.Post

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.filter(advertisement__isnull=True)

    def hashtag_list(self, obj):
        return "\n".join([hashtag.name for hashtag in obj.hashtags.all()])


@admin.register(post_models.Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = (
        'creator', 'caption', 'hashtag_list', 'created_on', 'url', 'gender', 'target_age_low',
        'target_age_high', 'interests', 'keyword')

    class Meta:
        model = post_models.Advertisement

    def hashtag_list(self, obj):
        return "\n".join([hashtag.name for hashtag in obj.hashtags.all()])


@admin.register(post_models.Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ('creator', 'created_on', 'view_visibility')

    class Meta:
        model = post_models.Story

    def export_story_as_csv(self, queryset):
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]
        filename = "Stories " + str(date.today())
        response = HttpResponse(content_type="text/csv")
        response[
            "Content-Disposition"
        ] = f"attachment; filename={filename}.csv"
        writer = csv.writer(response)
        writer.writerow(field_names + ["Visible"])
        for obj in queryset:
            data_row = [getattr(obj, field) for field in field_names]
            data_row.append(self.view_visibility(obj))
            writer.writerow(data_row)
        return response

    @admin.display(description="Visible", empty_value="False")
    def view_visibility(self, obj):
        return obj.created_on >= timezone.now() - timezone.timedelta(days=1)


@admin.register(post_models.StoryView)
class StoryViewAdmin(admin.ModelAdmin):
    list_display = ('story', 'user',)

    class Meta:
        model = post_models.StoryView


@admin.register(post_models.Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('creator', 'post', 'created_on',)

    class Meta:
        model = post_models.Like


@admin.register(post_models.Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('creator', 'post', 'content', 'created_on',)

    class Meta:
        model = post_models.Comment


@admin.register(post_models.Hashtag)
class HashtagAdmin(admin.ModelAdmin):
    list_display = ('name',)

    class Meta:
        model = post_models.Hashtag


@admin.register(post_models.Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ("action_type", "post", "creator", "created_on",)

    class Meta:
        model = post_models.Action
