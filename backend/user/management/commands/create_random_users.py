import names_generator
from django.core.management import BaseCommand

from user.models import User


class Command(BaseCommand):
    help = 'Create random sample users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--number', dest='number', type=int, default=30, help='Specifies the amount of users to create.'
        )

    def handle(self, *args, **kwargs):
        amount = kwargs.get('number')
        for i in range(amount):
            user_name_and_password = names_generator.generate_name()
            user = User.objects.create_user(user_name_and_password, user_name_and_password + "@random.net",
                                            user_name_and_password)
            print("created user:", user_name_and_password)
            user.save()
