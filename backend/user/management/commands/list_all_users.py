from django.core.management import BaseCommand

from user.models import User


class Command(BaseCommand):
    help = "List all users"

    def handle(self, *args, **options):
        for user in User.objects.all().iterator():
            print(user)
