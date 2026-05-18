import json
import random

from django.core.management import BaseCommand

from post.models import Post
from user.models import User
from util.image_utils import get_all_image_paths, read_image_as_base64


class Command(BaseCommand):
    help = 'Create random posts for random users'

    MAX_IMAGE_RESOLUTION = 1080

    def add_arguments(self, parser):
        parser.add_argument('--posts_per_user', dest='posts_per_user', type=int, default=1,
                            help='Specifies the amount of posts that should be randomly generated per user.')
        parser.add_argument('--img_dir', dest='img_dir', type=str, help="Location where the random images are located.")
        parser.add_argument('--hashtags_path', dest='hashtags_path', type=str,
                            help="Path to the json file containing the hashtags.")

    def handle(self, *args, **options):
        posts_per_user = options.get('posts_per_user')
        image_directory = options.get('img_dir')
        hashtags_path = options.get('hashtags_path')

        random_image_paths = get_all_image_paths(image_directory)
        random_hashtags = self._get_all_hashtags(hashtags_path)
        for user in User.objects.all().iterator():
            images_to_post = random.choices(random_image_paths, k=posts_per_user)
            for image in images_to_post:
                image_base64 = read_image_as_base64(image, self.MAX_IMAGE_RESOLUTION)
                selected_hashtags = random.choices(random_hashtags, k=3)
                post = Post(creator=user, content=image_base64, caption=" ".join(selected_hashtags))
                post.save()
                print("successfully posted:", post)

    def _get_all_hashtags(self, file_path):
        with open(file_path, "r") as file:
            hashtags = json.load(file)
            return hashtags
