from django import forms
from django.utils.html import format_html
from django.urls import reverse
from django.contrib import admin
from adminsortable2.admin import SortableAdminMixin, SortableAdminBase, SortableStackedInline
from django.utils.translation import gettext_lazy as _
from polymorphic.admin import PolymorphicParentModelAdmin, PolymorphicChildModelAdmin

from workbook import models as workbook_models

# Register your models here.

# Inlines for Multiple Choice Options, Task and Exercise
class MultipleChoiceOptionInline(admin.TabularInline):
    model = workbook_models.MultipleChoiceOption
    extra = 0
    fields = ('option', 'is_correct')
    verbose_name = _("multiple_choice_option_singular")
    verbose_name_plural = _("multiple_choice_option_plural")


class TaskInline(SortableStackedInline):
    model = workbook_models.Task
    extra = 0
    fields = ('title', 'type',)
    readonly_fields = ('title_link',)
    verbose_name = _("task_singular")
    verbose_name_plural = _("task_plural")

    def title_link(self, obj):
        if obj and obj.pk:
            url = reverse('admin:workbook_task_change', args=[obj.pk])
            return format_html('<a href="{}">{}</a>', url, _("edit_task"))
        return ""

    title_link.short_description = _("edit_task")

    def get_fields(self, request, obj=None):
        """Show title_link only for existing tasks; otherwise, show title and type for new tasks."""
        if obj is None:
            return ['title', 'type', 'order']
        else:
            return ['title', 'title_link', 'type', 'order']

class ExerciseInline(SortableStackedInline):
    model = workbook_models.Exercise
    extra = 0
    fields = ('title_link', 'title')
    readonly_fields = ('title_link',)
    verbose_name = _("exercise_singular")
    verbose_name_plural = _("exercise_plural")

    def title_link(self, obj):
        if obj.pk:
            url = reverse('admin:workbook_exercise_change', args=[obj.pk])
            return format_html('<a href="{}">{}</a>', url, _("edit_exercise"))
        return obj.title

    title_link.short_description = _("edit_exercise")


# Register the Admin interfaces to Edit Sections, Exercises and Tasks
@admin.register(workbook_models.Section)
class SectionAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ['order', 'title']
    search_fields = ('title',)
    inlines = [ExerciseInline]


@admin.register(workbook_models.Exercise)
class ExerciseAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = ['title', 'section']
    search_fields = ('title', 'section__title')
    inlines = [TaskInline]


@admin.register(workbook_models.Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'exercise', 'points')
    list_filter = ('type',)
    search_fields = ('title', 'exercise__title')
    inlines = [MultipleChoiceOptionInline]

    # Common fields for all tasks
    base_fields = ('title', 'exercise', 'type', 'upper_text', 'image_upload', 'image_data', 'lower_text')

    # This method makes sure that only the type-relevant fields are shown
    def get_fields(self, request, obj=None):
        fields = list(self.base_fields)
        if obj:
            if obj.type == 'TEXT_ANSWER':
                fields += ('minimum_answer_length', 'correct_answer', 'points')
            if obj.type == 'INTERACTIVE':
                fields += ('action_type', 'target_count', 'points')
            if obj.type == 'MULTIPLE_CHOICE':
                fields += ('points',)
            return fields
        # Show only common fields when creating a new task
        return fields

    # After creating the task, the task type should not be editable
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ('type',) + self.readonly_fields
        return self.readonly_fields

    # Show multiple choice options
    def get_inline_instances(self, request, obj=None):
        if obj:
            if obj.type == 'MULTIPLE_CHOICE':
                return super().get_inline_instances(request, obj)
            return []
        else:
            return []


# Submissions added to admin using tje Django polymorphic models
class SubmissionAdmin(PolymorphicParentModelAdmin):
    """Parent model admin to manage different submission types."""
    base_model = workbook_models.Submission
    child_models = (
        workbook_models.MultipleChoiceSubmission,
        workbook_models.TextAnswerSubmission,
        workbook_models.InteractiveSubmission
    )
    list_display = ('user', 'submitted_at', 'reviewed', 'correct', 'awarded_points', 'task')
    search_fields = ('user__username', 'task__title')
    list_filter = ('reviewed', 'correct')
    actions = ['mark_as_correct_and_reviewed']

    readonly_fields = ('awarded_points',)

    # Show link to each child model's admin page
    polymorphic_list = True

    # Fixes the TemplateDoesNotExist error. Prevents direct addition of a generic Submission.
    # Alternatively, you would have to create the missing template form for polymorphic classes.
    # Subtypes can be added on the other admin pages.
    def has_add_permission(self, request):
        return False

    def mark_as_correct_and_reviewed(self, request, queryset):
        """Mark selected submissions as both reviewed and correct."""
        updated_count = queryset.update(correct=True, reviewed=True)
        self.message_user(request, _(f"{updated_count} submissions reviewed and marked as correct."))

    mark_as_correct_and_reviewed.short_description = _("Mark selected submissions as reviewed and correct.")


# Admin class for MultipleChoiceSubmission
@admin.register(workbook_models.MultipleChoiceSubmission)
class MultipleChoiceSubmissionAdmin(PolymorphicChildModelAdmin):
    """Admin interface for Multiple Choice submissions."""
    base_model = workbook_models.MultipleChoiceSubmission
    list_display = ('user', 'submitted_at', 'reviewed', 'correct', 'task', 'choices')


# Admin class for TextAnswerSubmission
@admin.register(workbook_models.TextAnswerSubmission)
class TextAnswerSubmissionAdmin(PolymorphicChildModelAdmin):
    """Admin interface for Text Answer submissions."""
    base_model = workbook_models.TextAnswerSubmission
    list_display = ('user', 'submitted_at', 'reviewed', 'correct','task', 'answer')


# Admin for InteractiveSubmission
@admin.register(workbook_models.InteractiveSubmission)
class InteractiveSubmissionAdmin(PolymorphicChildModelAdmin):
    """Admin interface for Interactive submissions."""
    base_model = workbook_models.InteractiveSubmission
    list_display = ('user', 'submitted_at', 'correct', 'current_count', 'target_count', 'task')
    search_fields = ('user__username', 'task__title')

# Register the Submission model explicitly with its PolymorphicParentModelAdmin
# Recommended when using the django-polymorphic library
admin.site.register(workbook_models.Submission, SubmissionAdmin)
