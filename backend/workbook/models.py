from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from polymorphic.models import PolymorphicModel

from util import image_utils

# -------------------------------------- Brief Overview --------------------------------------
"""
The workbook is organized hierarchically:
    Sections consist of exercises, exercises consist of tasks.
    Tasks are not assigned to specific students, they are the same for each student.
    Students get rewards (points) for completing tasks.
    Task progress is tracked via submissions.

Task types:
    1.	Multiple-Choice: Task with predefined options; can be automatically evaluated.
    2.	Text Answer: Task which (in most cases) requires subjective judgment in regard of the response and is (mosty) manually evaluated. If there is a correct answer specified, the task is automatically evaluated.
    3.	Interactive: Task involving actions on the platform that are automatically tracked and validated.
    4.  Content: The teacher/admin can add content (text, images) blocks between Tasks. The content blocks are not treated as real tasks, students cannot make submissions to them.

Submissions:
    Students create unique submissions to tasks. These submissions are evaluated and checked if they are correct.
    If a submission is marked as correct, the task is also marked as correct for the student and points are awarded.
"""

# -------------------------------------- Section --------------------------------------
class Section(models.Model):
    """Represents the top-level category containing multiple exercises."""
    title = models.CharField(max_length=255, verbose_name=_("section_title"))
    order = models.PositiveIntegerField(default=0, db_index=True, verbose_name=_("order"), help_text=_("Position of the section inside the workbook. Reorder sections in the Sections admin."))

    def __str__(self):
        return self.title
    class Meta:
        ordering = ["order"]
        verbose_name = _("section_singular")
        verbose_name_plural = _("section_plural")


# -------------------------------------- Exercise --------------------------------------
class Exercise(models.Model):
    """Represents an exercise within a section. Contains multiple tasks."""
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="exercises", verbose_name=_("section_singular"))
    title = models.CharField(max_length=255, verbose_name=_("exercise_title"))
    order = models.PositiveIntegerField(default=0, db_index=True, verbose_name=_("order"), help_text=_("Position of the exercise inside the parent section. Reorder exercises by editing the section."))

    def __str__(self):
        return self.title

    class Meta:
        ordering = ["order"]
        verbose_name = _("exercise_singular")
        verbose_name_plural = _("exercise_plural")


# -------------------------------------- Tasks --------------------------------------
class Task(models.Model):
    """Represents a task within an exercise. Can be of different types."""

    TASK_TYPES = [
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('TEXT_ANSWER', 'Text Answer'),
        ('INTERACTIVE', 'Interactive'),
        ('CONTENT', 'Content') # Fake-Task, this will only show the body on the frontend
    ]

    # Interaction types for interactive tasks
    ACTION_TYPES = [
        ('CREATE_POST', 'Create Post'),
        ('LIKE_POST', 'Like Post'),
        ('COMMENT_POST', 'Comment Post'),
        ('FOLLOW', 'Follow'),
        ('CREATE_STORY', 'Create Story'),
        ('CREATE_ADVERTISEMENT', 'Create Advertisement'),
        ('EDIT_PROFILE', 'Edit Profile'),
    ]

    # Relevant fields for all task types
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="tasks", verbose_name=_("exercise_singular"), help_text=_("Assigns the task to an exercise. If you change the initially assigned exercise, make sure to check the correct ordering."))
    title = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("task_title"))
    type = models.CharField(max_length=20, choices=TASK_TYPES, default="CONTENT", verbose_name=_("task_type"), help_text=_("Choose the task type upon creation. Do NOT change this later!"))
    upper_text = models.TextField(blank=True, null=True, verbose_name=_("task_upper_text"), help_text=_("Set the text to be displayed above the (optional) task image."))
    image_upload = models.FileField(blank=True, null=True, validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])], verbose_name=_("image_upload"), help_text=_("upload_task_image_help"))
    image_data = models.TextField(blank=True, null=True, verbose_name=_("task_image")) # Base64 encoded image data
    lower_text = models.TextField(blank=True, null=True, verbose_name=_("task_lower_text"), help_text=_("Set the text to be displayed under the (optional) task image."))
    points = models.PositiveIntegerField(default=0, verbose_name=_("point_plural"), help_text=_("Points awarded to the student for successfully completing the task."))
    order = models.PositiveIntegerField(default=0, db_index=True, verbose_name=_("order"), help_text=_("Position of the task inside the parent exercise."))

    # Only for TEXT_ANSWER
    minimum_answer_length = models.IntegerField(blank=True, null=True, verbose_name=_("minimum_answer_length"), help_text=_("The student has to type (at least) the specified amount of characters to make a submission."))
    correct_answer = models.TextField(blank=True, null=True, verbose_name=_("correct_answer"), help_text=_("Set a correct answer for this task. The student have to submit the exact same answer to complete the task. If set, the correction is done automatically."))

    # Only for INTERACTIVE
    action_type = models.CharField(max_length=30, blank=True, null=True, choices=ACTION_TYPES, verbose_name=_("action_type"), help_text=_("Specify the action the student has to perform."))
    target_count = models.IntegerField(blank=True, null=True, verbose_name=_("target_action_count"), help_text=_("The student has to perform the action this many times to complete the task."))

    def clean(self):
        """Custom validation for image file size and type."""
        max_file_size = 5 * 1024 * 1024
        if self.image_upload and self.image_upload.size > max_file_size:
            raise ValidationError(_("The uploaded image file size cannot exceed 5MB."))

    def save(self, *args, **kwargs):
        """Process and save the uploaded image as base64."""
        if self.image_upload:
            # Compress and convert the image to base64
            self.image_data = image_utils.save_image_as_base64(self.image_upload, 800, 800)
            # Clear the image upload field, since no longer needed
            self.image_upload = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"

    class Meta:
        ordering = ["order"]
        verbose_name = _("task_singular")
        verbose_name_plural = _("task_plural")


class MultipleChoiceOption(models.Model):
    """Represents an option for multiple-choice questions."""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="options")
    option = models.CharField(max_length=255, default="", verbose_name=_("option_singular"))
    is_correct = models.BooleanField(default=False, verbose_name=_("is_correct"))

    def __str__(self):
        return f'{self.option} ({_("is_correct") if self.is_correct else _("is_incorrect")})'

# -------------------------------------- Submissions --------------------------------------

class Submission(PolymorphicModel):
    """Superclass for all different submission types. Represents one task the student submitted his or her work on."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="submissions", verbose_name=_("user_singular"))
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="submissions", verbose_name=_("task_singular"))
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name=_("submitted_at"))
    reviewed = models.BooleanField(default=False, verbose_name=_("submission_reviewed"), help_text=_("Tick this box after you have reviewed the submission."))
    feedback = models.TextField(blank=True, verbose_name=_("submission_feedback"), help_text=_("Optional feedback for the student."))
    correct = models.BooleanField(default=False, verbose_name=_("submission_correct"), help_text=_("Tick this box if the submission is correct."))
    awarded_points = models.PositiveIntegerField(default=0, verbose_name=_("awarded_points"), help_text=_("The points earned by the student for this submission. It is set once the submission is marked as correct and the student has claimed the points."))

    class Meta:
        unique_together = ("user", "task")  # User can only have one submission per task, otherwise it would get complicated
        verbose_name = _("submission_singular")
        verbose_name_plural = _("submission_plural")

class MultipleChoiceSubmission(Submission):
    """Submission for Multiple Choice task."""
    choices = models.JSONField(verbose_name=_("selected_choices"))  # Stores selected options as JSON


class TextAnswerSubmission(Submission):
    """Submission for Text Answer task."""
    answer = models.TextField(blank=True, verbose_name=_("submitted_answer"))  # User's answer


class InteractiveSubmission(Submission):
    """Submission for an interactive task."""

    ACTION_TYPES = [
        ('CREATE_POST', 'Create Post'),
        ('LIKE_POST', 'Like Post'),
        ('COMMENT_POST', 'Comment Post'),
        ('FOLLOW', 'Follow'),
        ('CREATE_STORY', 'Create Story'),
        ('CREATE_ADVERTISEMENT', 'Create Advertisement'),
        ('EDIT_PROFILE', 'Edit Profile'),
    ]

    action_type = models.CharField(max_length=30, choices=ACTION_TYPES, default="CREATE_POST", verbose_name=_("action_type"))
    target_count = models.IntegerField(default=1, verbose_name=_("target_action_count"))
    current_count = models.IntegerField(default=0, verbose_name=_("current_action_count"))

    def is_solved(self):
        return self.current_count >= self.target_count
