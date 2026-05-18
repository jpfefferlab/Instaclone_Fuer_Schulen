from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.views import APIView

from post import models as post_models
from user import models as user_models


# Create your views here.
class AnalyticsAPIView(APIView):
    def get(self, request):
        students = User.objects.all()
        profiles = user_models.Profile.objects.all()
        posts = post_models.Post.objects.all()  # posts: One line per post-hashtag combination
        hashtags = post_models.Hashtag.objects.all()
        total_posts = post_models.Post.objects.filter(advertisement__isnull=True).count()
        total_stories = post_models.Story.objects.count()
        total_likes = post_models.Like.objects.count()
        total_comments = post_models.Comment.objects.count()

        # For calculating hashtag frequency
        # Extract all hashtag ids, which are not None (returns one line per post-hashtags combi)
        ph = [p['hashtags'] for p in list(posts.values('hashtags')) if p['hashtags'] is not None]

        context = {
            "total_student_count": len(students),
            "total_post_count": total_posts,
            "total_story_count": total_stories,
            "total_like_count": total_likes,
            "total_comment_count": total_comments,
            "students": list(students.values('first_name', 'last_name', 'username', 'id')),
            # get a list of profile dicts, replace all None values with 'None'
            "profiles": [{k: ('NONE' if v is None else v) for k, v in p.items()} for p in
                         list(profiles.values('age', 'gender', 'interests', 'user', 'user__username'))],
            "posts": [{k: ('NONE' if v is None else v) for k, v in p.items()} for p in
                      list(posts.values('id', 'creator', 'caption', 'hashtags'))],
            "h_counter": {x: ph.count(x) for x in set(ph)},
            "hashtags": {p['id']: p['name'] for p in list(hashtags.values('name', 'id'))},

        }
        return Response(context)
