import json
import random
from warnings import catch_warnings

import names_generator
import requests

from django.core.management import BaseCommand
from faker import Faker
from pytz import timezone

from post.models import Post, Comment, Like, Advertisement
from user.models import User, Following
from util.image_utils import read_image_as_base64

# Simple command to automatically seed a newsfeed with random posts, comments and likes
#
# python manage.py tenant_command seed_newsfeed --schema=<schema_name>
# e.g.
#   python manage.py tenant_command seed_newsfeed --schema=<schema_name> --user_count=15 --posts_per_user=5 --clear_posts
class Command(BaseCommand):
    help = 'Create random posts, for random users, with random likes and comments'

    MAX_IMAGE_RESOLUTION = 1080

    def add_arguments(self, parser):
        parser.add_argument('--clear_posts', default=False, action='store_true',
                            help='Specifies if all posts should be deleted before creating new ones')

        parser.add_argument('--clear_users',  default=False, action='store_true',
                            help='Specifies if all posts should be deleted before creating new ones')

        parser.add_argument('--clear_ads',  default=False, action='store_true',
                            help='Specifies if all ads should be deleted before creating new ones')

        parser.add_argument('--topic_posts',  default=False, action='store_true',
                            help='Specifies if accounts for certain specialized topic posts should be created')

        parser.add_argument('--pexels_api_key', dest='pexels_api_key', default=None,
                            help='Specifies the amount of users that should be randomly generated')

        parser.add_argument('--with_ads',  default=False, action='store_true',
                            help='Specifies if ads should be created')

        parser.add_argument('--with_follows',  default=False, action='store_true',
                            help='Specifies if follows should be created')

        parser.add_argument('--force_clusters',  default=False, action='store_true',
                            help='Specifies if likes, comments, follows should enforce clusters')

        parser.add_argument('--user_count', dest='user_count', type=int, default=30,
                            help='Specifies the amount of users that should be randomly generated')

        parser.add_argument('--posts_per_user', dest='posts_per_user', type=int, default=2,
                            help='Specifies the amount of posts that should be randomly generated per user.')

        parser.add_argument('--post_days_back', dest='post_days_back', type=int, default=7,
                            help='Specifies how many days back the posts should be created')


    def handle(self, *args, **options):
        user_count = options.get('user_count')
        posts_per_user = options.get('posts_per_user')
        clear_posts = options.get('clear_posts')
        clear_users = options.get('clear_users')
        clear_ads = options.get('clear_ads')
        post_days_back = options.get('post_days_back')
        topic_posts = options.get('topic_posts')
        pexels_api_key = options.get('pexels_api_key')
        force_clusters = options.get('force_clusters')
        with_ads = options.get('with_ads')
        with_follows = options.get('with_follows')

        # Clear all posts
        if clear_posts is True:
            print("Clearing all posts ...")

            Post.objects.all().delete()

        # Clear all users except the superuser
        if clear_users is True:
            print("Clearing all users ...")

            Following.objects.all().delete()
            User.objects.exclude(is_superuser=True).delete()

        if clear_ads is True:
            print("Clearing all ads ...")

            Advertisement.objects.all().delete()

        # Create users
        if User.objects.all().count() < user_count:
            print("Seeding users")

            missing_user_count = user_count - User.objects.all().count()
            for _ in range(missing_user_count):
                user_name_and_password = names_generator.generate_name() # password = username
                user = User.objects.create_user(user_name_and_password, user_name_and_password + "@random.net",
                                                user_name_and_password)
                user.save()
                print(".", end="", flush=True)

            print()


        user_clusters = {
            'cluster1': [],
            'cluster2': [],
            'cluster3': [],
            'other': [],
        }

        if force_clusters:
            if User.objects.all().count() < 20:
                print("Error. Please provide at least 3 users to enforce clusters")
                return Exception("Please provide at least 3 users to enforce clusters")

            print("Enforcing clusters for likes, comments and follows")

            # Clear all likes, comments and follows
            Like.objects.all().delete()
            Comment.objects.all().delete()
            Following.objects.all().delete()

            # Randomly assign users to clusters
            users = User.objects.all()
            for user in users:
                cluster = random.choice(list(user_clusters.keys()))
                user_clusters[cluster].append(user)

            print()

        topics = [
            "cars", "food", "travel", "photography", "music",  "sports", "nature"
        #     "fitness", "art", "fashion",
        ]
        if topic_posts:
            print("Seeding topic specific accounts and posts")
            self.create_topic_specific_content(topics=topics, pexels_api_key=pexels_api_key)

            print()


        non_topic_users = User.objects.all().exclude(username__in=topics)

        # Create posts
        print("Seeding posts")

        for user in non_topic_users.iterator():
            for _ in range(posts_per_user):
                self.create_post(user)

        print()

        # Create comments
        print("Seeding comments")
        self.create_comments(non_topic_users)

        print()

        # Create likes
        print("Seeding likes")
        self.create_likes(non_topic_users)

        print()

        # Create advertisements
        if with_ads:
            print("Seeding advertisements")
            self.create_ads()

        print()

        # Create follows
        if with_follows:
            print("Seeding follows")
            self.create_follows(non_topic_users)

        print()

    def create_topic_specific_content(self, topics, pexels_api_key=None):
        if pexels_api_key is None:
            print("Error. Please provide a Pexel API key")
            return Exception("Please provide a Pexel API key")

        # Create users for each topic
        users = []
        for topic in topics:
            # If users already exist for the topic, get the object
            if User.objects.filter(username=topic).exists():
                users.append(User.objects.get(username=topic))
                continue

            user = User.objects.create_user(topic, topic + "@random.net",
                                            topic)
            user.save()
            users.append(user)

            print(".", end="", flush=True)

        # Create topic specific posts
        for user in users:
            url = "https://api.pexels.com/v1/search?query=" + user.username + "&per_page=5"
            response = requests.get(url, stream=True,
                                  headers={'Authorization': pexels_api_key})

            imageUrls = []

            if response.status_code == 200:
                data = response.json()
                for photo in data['photos']:
                    imageUrls.append(photo['src']['original'])

            for imageUrl in imageUrls:
                image = requests.get(imageUrl, stream=True).raw
                self.create_post(user, post_days_back=7, raw_image=image)

    def create_post(self, user, post_days_back=5, raw_image=None):
        # Create a random post for the user with a random image (fetched from online free image generator) and random hashtags
        random_hashtags = [
            "#instagood", "#photooftheday", "#beautiful", "#fashion", "#happy", "#tbt", "#cute", "#like4like",
            "#followme", "#picoftheday", "#follow", "#me", "#selfie", "#summer", "#art", "#instadaily", "#friends",
        ]

        fake = Faker()

        if raw_image is None:
            image = requests.get("https://picsum.photos/1080/720", stream=True).raw
        else:
            image = raw_image

        try:
            image_base64 = read_image_as_base64(image, self.MAX_IMAGE_RESOLUTION)
            selected_hashtags = random.choices(random_hashtags, k=3)
            post = Post(
                creator=user,
                content=image_base64,
                caption=" ".join(selected_hashtags),
                created_on=fake.date_time_between(start_date='-' + str(post_days_back) + 'd', end_date='now', tzinfo=timezone('Europe/Berlin'))
            )
            post.save()
            print(".", end="", flush=True)

            return post
        except:
            print("x", end="", flush=True)



    def create_comments(self, non_topic_users=None):
        comments = [
            "Nice post!",
            "I like it!",
            "Great picture!",
            "Awesome!",
            "Cool!",
            "Nice!",
            "Love it!",
            "Amazing!",
            "Beautiful!",
            "Stunning!",
            "Fantastic!",
            "Incredible!",
            "Impressive!",
        ]

        # Get number of all available posts
        post_count = Post.objects.all().count()

        for user in non_topic_users.iterator():
            # Randomly define how many posts the user should comment on
            posts_to_comment_on = random.randint(0, min(post_count, 10))

            if posts_to_comment_on == 0:
                continue

            # Randomly select posts to comment on
            posts = random.sample(list(Post.objects.all()), posts_to_comment_on)

            for post in posts:
                # Check if user has already commented on the post
                if post.comment_set.filter(creator=user).exists():
                    continue

                comment = Comment(post=post, creator=user, content=random.choice(comments))
                comment.save()

                print(".", end="", flush=True)

    def create_likes(self, non_topic_users=None):
        # Get number of all available posts
        post_count = Post.objects.all().count()

        for user in non_topic_users.iterator():
            # Randomly define how many posts the user should like
            posts_to_like = random.randint(0, min(post_count, 15))

            if posts_to_like == 0:
                continue

            # Randomly select posts to like
            posts = random.sample(list(Post.objects.all()), posts_to_like)

            for post in posts:
                # check if user has already liked the post
                if post.like_set.filter(creator=user).exists():
                    continue

                like = Like(post=post, creator=user)
                like.save()

                print(".", end="", flush=True)

    def _get_all_hashtags(self, file_path):
        with open(file_path, "r") as file:
            hashtags = json.load(file)
            return hashtags

    def get_random_image_as_base64(self):
        path = requests.get("https://picsum.photos/1080/720", stream=True).raw
        image_base64 = read_image_as_base64(path, self.MAX_IMAGE_RESOLUTION)

        return image_base64

    def create_ads(self):
        # reset ads
        Advertisement.objects.all().delete()

        for user in User.objects.all().iterator():
            image_base64 = self.get_random_image_as_base64()

            ad = Advertisement(creator=user, content=image_base64, caption="Test Ad", url="https://www.google.de",
                               interests="CARS", no_interests=True, gender="MALE,NA",
                               target_age_none=True, target_age_low=0, target_age_high=100)
            ad.save()

            print(".", end="", flush=True)

    def create_follows(self, non_topic_users=None):
        # reset follows
        Following.objects.all().delete()

        for user in non_topic_users.iterator():
            users_to_follow = random.sample(list(User.objects.all()), random.randint(0, min(User.objects.all().count(), 10)))

            for user_to_follow in users_to_follow:
                # Check if user is already following the user
                if Following.objects.filter(user=user, following_user=user_to_follow).exists():
                    continue

                follow = Following(user=user, following_user=user_to_follow)
                follow.save()

                print(".", end="", flush=True)
