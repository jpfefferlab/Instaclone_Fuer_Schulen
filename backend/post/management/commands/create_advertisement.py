import random

from django.core.management import BaseCommand

from post.models import Advertisement
from user.models import User
from util.image_utils import get_all_image_paths, read_image_as_base64


class Command(BaseCommand):
    help = "Create one random advertisement for the given user"

    MAX_IMAGE_RESOLUTION = 1080

    def add_arguments(self, parser):
        parser.add_argument('--img_dir', dest='img_dir', type=str, help='Location where the random images are located.')
        parser.add_argument('--user', dest='user', type=str, default="admin",
                            help='The username of the user to post an advertisement for.')

    def handle(self, *args, **options):
        image_directory = options.get('img_dir')
        username = options.get("user")
        user = User.objects.filter(username=username).get()

        random_image_paths = get_all_image_paths(image_directory)
        image_to_post = random.choice(random_image_paths)
        image_base64 = read_image_as_base64(image_to_post, self.MAX_IMAGE_RESOLUTION)
        ad = Advertisement(creator=user, content=image_base64, caption="Test Ad", url="https//www.google.de")
        ad.save()
        print("successfully created ad")
