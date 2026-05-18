from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers
from .models import Section, Exercise, Submission, Task, MultipleChoiceOption, MultipleChoiceSubmission, TextAnswerSubmission, InteractiveSubmission
from user import serializers as user_serializers

# Takes python code and translates it to a JSON response
# Use nested serializers for representing the workbook

class MultipleChoiceOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MultipleChoiceOption
        fields = ["id", "task", "option", "is_correct"]

class TaskSerializer(serializers.ModelSerializer):
    options = MultipleChoiceOptionSerializer(many=True, read_only=True)
    image = serializers.SerializerMethodField('get_image_base64')

    minimum_answer_length = serializers.SerializerMethodField()
    correct_answer = serializers.SerializerMethodField()
    target_count = serializers.SerializerMethodField()
    action_type = serializers.SerializerMethodField()

    def get_minimum_answer_length(self, obj):
        return obj.minimum_answer_length if obj.minimum_answer_length is not None else 0

    def get_correct_answer(self, obj):
        return obj.correct_answer if obj.correct_answer is not None else ""

    def get_target_count(self, obj):
        return obj.target_count if obj.target_count is not None else 1

    def get_action_type(self, obj):
        return obj.action_type if obj.action_type is not None else ""

    def get_image_base64(self, obj):
        return f"data:image/jpeg;base64,{obj.image_data}" if obj.image_data is not None else None

    class Meta:
        model = Task
        fields = [
            "id",
            "exercise",
            "title",
            "type",
            "upper_text",
            "image",
            "lower_text",
            "minimum_answer_length",
            "correct_answer",
            "action_type",
            "target_count",
            "options",
            "points",
            "order",
        ]

class ExerciseSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    class Meta:
        model = Exercise
        fields = ["id", "section", "title", "tasks", "order"]

class SectionSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)
    class Meta:
        model = Section
        fields = ["id", "title", "exercises", "order"]

# -------------------------------------- Submissions --------------------------------------

class MultipleChoiceSubmissionSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    choices = serializers.ListField(
        child=serializers.IntegerField()
    )

    class Meta:
        model = MultipleChoiceSubmission
        fields = ["choices"]

    def validate(self, data):
        # Validate that the task is a Multiple Choice type task
        try:
            task = Task.objects.get(id=data['task_id'])
        except Task.DoesNotExist:
            raise serializers.ValidationError("Task does not exist.")

        if task.type != 'MULTIPLE_CHOICE':
            raise serializers.ValidationError("Task is not of type 'Multiple Choice'.")

        # Ensure the selected options belong to this task
        options = MultipleChoiceOption.objects.filter(id__in=data['choices'], task=task)
        if len(options) != len(data['choices']):
            raise serializers.ValidationError("One or more selected options are invalid.")

        return data

    def create_or_update_submission(self, validated_data, user):
        task = Task.objects.get(id=validated_data['task_id'])

        # Calculate if the submission is correct
        correct_options = MultipleChoiceOption.objects.filter(task=task, is_correct=True).values_list('id', flat=True)
        submitted_options = validated_data['choices']
        is_correct = set(correct_options) == set(submitted_options)

        # Check if there is an existing submission for this user and task
        try:
            submission = MultipleChoiceSubmission.objects.get(user=user, task=task)

            # Allow resubmission only if the previous submission was incorrect
            if not submission.correct:
                submission.choices = validated_data['choices']
                submission.correct = is_correct
                submission.reviewed = True  # Automatically mark as reviewed
                submission.submitted_at = timezone.now()  # Update the submission date
                submission.save()
            else:
                raise serializers.ValidationError("You cannot resubmit a correct answer.")
        except MultipleChoiceSubmission.DoesNotExist:
            # Create a new submission if none exists
            submission = MultipleChoiceSubmission.objects.create(
                user=user,
                task=task,
                correct=is_correct,
                reviewed=True,  # Automatically mark as reviewed
                choices=validated_data['choices']  # Store the submitted option IDs as JSON
            )

        return submission

    def create(self, validated_data):
        user = self.context['request'].user
        return self.create_or_update_submission(validated_data, user)

# Mostly the same logic as with the MultipleChoiceSubmissionSerializer
class TextAnswerSubmissionSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    answer = serializers.CharField()

    def validate(self, data):
        try:
            task = Task.objects.get(id=data['task_id'])
        except Task.DoesNotExist:
            raise serializers.ValidationError("Task does not exist.")

        if task.type != 'TEXT_ANSWER':
            raise serializers.ValidationError("Task is not a text-answer task.")

        return data

    def evaluate_submission(self, task, answer):
        """
        Evaluates the submission automatically if the correct answer is available.
        If there's no correct answer or it's a manual review, return 'needs_review'.
        """
        correct_answer = task.correct_answer # Could be empty string or None
        submitted_answer = answer.strip().lower()

        # Manual review if no correct answer is provided
        if correct_answer is None or correct_answer.strip() == "":
            return 'needs_review'

        # Compare the normalized correct_answer with the submitted answer
        correct_answer = correct_answer.strip().lower()
        if correct_answer == submitted_answer:
            return 'correct'  # Auto-evaluation: answer matches
        else:
            return 'incorrect'  # Auto-evaluation: answer does not match

    def create_or_update_submission(self, validated_data, user):
        task = Task.objects.get(id=validated_data['task_id'])
        user_answer = validated_data['answer']

        # Determine if submission can be auto-evaluated or needs manual review
        evaluation_result = self.evaluate_submission(task, user_answer)

        is_correct = evaluation_result == 'correct'
        needs_review = evaluation_result == 'needs_review'

        try:
            submission = TextAnswerSubmission.objects.get(user=user, task=task)
            submission.answer = user_answer
            submission.correct = is_correct
            submission.reviewed = not needs_review
            submission.submitted_at = timezone.now()
            submission.save()
        except TextAnswerSubmission.DoesNotExist:
            submission = TextAnswerSubmission.objects.create(
                user=user,
                task=task,
                answer=user_answer,
                correct=is_correct,
                reviewed=not needs_review,
            )
        return submission

    def create(self, validated_data):
        user = self.context['request'].user
        return self.create_or_update_submission(validated_data, user)

class InteractiveSubmissionSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    action_type = serializers.ChoiceField(choices=InteractiveSubmission.ACTION_TYPES)
    target_count = serializers.IntegerField(default=1)
    current_count = serializers.IntegerField(default=0)

    # Logic to validate submission data based on task, type and target count
    def validate(self, data):
        try:
            task = Task.objects.get(id=data['task_id'])
        except Task.DoesNotExist:
            raise serializers.ValidationError("Task does not exist.")

        if task.type != 'INTERACTIVE':
            raise serializers.ValidationError("Task is not of type 'Interactive'.")

        if data['target_count'] <= 0:
            raise serializers.ValidationError("Target count must be greater than zero.")

        return data

    def create(self, validated_data):
        user = self.context['request'].user
        task = Task.objects.get(id=validated_data['task_id'])

        # Create the InteractiveSubmission instance
        submission = InteractiveSubmission.objects.create(
            user=user,
            task=task,
            action_type=validated_data['action_type'],
            target_count=validated_data['target_count'],
            current_count=0,
            correct=False,
            reviewed=False,
        )

        return submission


class SubmissionSerializer(serializers.ModelSerializer):
    user = user_serializers.UserDetailFlatSerializer(required=False)
    multiple_choice_submission = serializers.SerializerMethodField()
    text_answer_submission = serializers.SerializerMethodField()
    interactive_submission = serializers.SerializerMethodField()
    class Meta:
        model = Submission
        fields = [
            "id",
            "user",
            "task",
            "submitted_at",
            "reviewed",
            "feedback",
            "correct",
            "multiple_choice_submission",
            "text_answer_submission",
            "interactive_submission",
            "awarded_points"
        ]

    def get_multiple_choice_submission(self, instance):
        if isinstance(instance, MultipleChoiceSubmission):
            return MultipleChoiceSubmissionSerializer(instance).data
        return None

    def get_text_answer_submission(self, instance):
        if isinstance(instance, TextAnswerSubmission):
            return TextAnswerSubmissionSerializer(instance).data
        return None

    def get_interactive_submission(self, instance):
        if isinstance(instance, InteractiveSubmission):
            return InteractiveSubmissionSerializer(instance).data
        return None

    def to_representation(self, instance):
        # Call the parent method to get the default representation, then change based on type
        representation = super().to_representation(instance)

        if isinstance(instance, MultipleChoiceSubmission):
            representation["multiple_choice_submission"] = MultipleChoiceSubmissionSerializer(instance).data
        if isinstance(instance, TextAnswerSubmission):
            representation["text_answer_submission"] = TextAnswerSubmissionSerializer(instance).data
        if isinstance(instance, InteractiveSubmission):
            representation["interactive_submission"] = InteractiveSubmissionSerializer(instance).data

        return representation
