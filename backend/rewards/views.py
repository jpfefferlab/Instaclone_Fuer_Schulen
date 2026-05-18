# rewards/views.py
from rest_framework.response import Response
from rest_framework import views, viewsets, generics, permissions, status

from rewards import models as rewards_models
from rewards import serializers as rewards_serializers
from workbook import models as workbook_models

class PointsViewSet(viewsets.ViewSet):
    """Displays the user's points details."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        points, created = rewards_models.Points.objects.get_or_create(user=request.user)
        serializer = rewards_serializers.PointsSerializer(points)
        return Response(serializer.data)

class AddPointsView(views.APIView):
    """Add points to the user's account. Updates the number of completed tasks."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        # Validate the request body
        serializer = rewards_serializers.AddPointsSerializer(data=request.data)
        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            user_points, created = rewards_models.Points.objects.get_or_create(user=request.user)
            # Check if a submission ID is provided and update awarded_points if necessary
            submission_id = request.data.get('submission_id')
            if submission_id:
                try:
                    submission = workbook_models.Submission.objects.get(id=submission_id)

                    if submission.awarded_points > 0:
                        return  Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

                    submission.awarded_points = amount
                    submission.save()
                    user_points.tasks_completed += 1
                    user_points.save()
                except workbook_models.Submission.DoesNotExist:
                    return Response({"error": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)

            # Add points to the user's points balance
            user_points.add_points(amount)

            # Return a success response
            return Response({
                "message": f"{amount} points added successfully!",
                "points_balance": user_points.points_balance
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FeatureListView(views.APIView):
    """Returns a list of globally available features."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        features = rewards_models.Feature.objects.all()
        serializer = rewards_serializers.FeatureSerializer(features, many=True)
        return Response(serializer.data)

class UserFeatureListView(generics.ListAPIView):
    """Returns all the features of the user. Both locked and unlocked features."""
    serializer_class = rewards_serializers.UserFeatureSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        return rewards_models.UserFeature.objects.filter(user=user)

    def list(self, request, *args, **kwargs):
        """Returns the features."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class UnlockFeatureView(views.APIView):
    """Try to unlock a certain feature for the user. Returns an error if user doesn't have enough points."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        request.data['user'] = request.user.id
        serializer = rewards_serializers.UnlockFeatureSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Unlock the feature and deduct points
            user_feature = serializer.save()
            # Fetch the updated points balance
            user_points = serializer.validated_data['user_points']
            return Response({
                "message": "Feature unlocked successfully!",
                "feature": rewards_serializers.FeatureSerializer(user_feature.feature).data,
                "points_balance": user_points.points_balance,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
