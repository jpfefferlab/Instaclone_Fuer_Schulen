import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import viewsets, generics, permissions, status
from .models import InteractiveSubmission, Section, Exercise, Task, Submission
from .serializers import SectionSerializer, ExerciseSerializer, SubmissionSerializer, TaskSerializer, MultipleChoiceSubmissionSerializer, TextAnswerSubmissionSerializer, InteractiveSubmissionSerializer

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.prefetch_related('exercises__tasks__options').all()
    serializer_class = SectionSerializer
    permission_classes = (permissions.IsAuthenticated,)

# APIView to fetch a single Exercise via id
class ExerciseAPIView(generics.RetrieveAPIView):
    queryset = Exercise.objects.prefetch_related('tasks').all()
    serializer_class = ExerciseSerializer
    permission_classes = (permissions.IsAuthenticated,)

class TaskView(generics.ListCreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = (permissions.IsAuthenticated,)


class UserSubmissionsViewSet(viewsets.ReadOnlyModelViewSet):
    """View to retrieve all submissions of the logged-in user. Can be filtered based on exercise_id"""
    serializer_class = SubmissionSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        exercise_id = self.request.query_params.get('exercise_id')
        queryset = Submission.objects.filter(user=self.request.user)

        if exercise_id:
            tasks = Task.objects.filter(exercise_id=exercise_id).values_list('id', flat=True)
            queryset = queryset.filter(task__in=tasks)

        return queryset


class SpecificSubmissionViewSet(viewsets.ViewSet):
    """Retrieve a specific submission for a task, including its details"""
    permission_classes = (permissions.IsAuthenticated,)

    def retrieve(self, request, pk=None):
        try:
            task = Task.objects.get(id=pk)
            submission = Submission.objects.get(user=request.user, task=task)

            # Use the SubmissionSerializer to serialize the submission data
            serializer = SubmissionSerializer(submission)
            return Response(serializer.data)

        except Task.DoesNotExist:
            return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        except Submission.DoesNotExist:
            return Response({'detail': 'Submission not found'}, status=status.HTTP_404_NOT_FOUND)

class MultipleChoiceSubmissionViewSet(viewsets.ViewSet):
    """Handle submissions for multiple choice questions."""
    permission_classes = (permissions.IsAuthenticated,)

    def create(self, request, *args, **kwargs):
        serializer = MultipleChoiceSubmissionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            submission = serializer.save()
            full_data = SubmissionSerializer(submission).data
            return Response(full_data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TextAnswerSubmissionViewSet(viewsets.ViewSet):
    """Handle submissions for text-answer questions."""
    permission_classes = (permissions.IsAuthenticated,)

    def create(self, request, *args, **kwargs):
        serializer = TextAnswerSubmissionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            submission = serializer.save()
            full_data = SubmissionSerializer(submission).data
            return Response(full_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InteractiveSubmissionViewSet(viewsets.ModelViewSet):
    """Handle submissions for interactive tasks."""
    permission_classes = (permissions.IsAuthenticated,)

    def create(self, request, *args, **kwargs):
        serializer = InteractiveSubmissionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            submission = serializer.save()
            full_data = SubmissionSerializer(submission).data
            return Response(full_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
