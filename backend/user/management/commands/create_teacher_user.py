from django.core.management import BaseCommand

from user.management.util import get_or_create_teacher_user_group, create_teacher_user_and_add_to_group


class Command(BaseCommand):
    help = 'Create user for teacher with correct permissions'

    def handle(self, *args, **options):
        teacher_group = get_or_create_teacher_user_group()
        create_teacher_user_and_add_to_group(teacher_group)
