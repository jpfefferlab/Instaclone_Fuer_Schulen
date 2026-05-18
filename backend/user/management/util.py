from django.contrib.auth.models import Group, User, Permission

TEACHER_PERMISSIONS_CODENAMES = [
    "add_user",
    "change_user",
    "delete_user",
    "view_user",
    "add_setting",
    "change_setting",
    "delete_setting",
    "view_setting",
    "add_profile",
    "change_profile",
    "delete_profile",
    "view_profile",
    "add_following",
    "change_following",
    "delete_following",
    "view_following",
    "add_hashtag",
    "change_hashtag",
    "delete_hashtag",
    "view_hashtag",
    "add_story",
    "change_story",
    "delete_story",
    "view_story",
    "add_post",
    "change_post",
    "delete_post",
    "view_post",
    "add_comment",
    "change_comment",
    "delete_comment",
    "view_comment",
    "add_action",
    "change_action",
    "delete_action",
    "view_action",
    "add_storyview",
    "change_storyview",
    "delete_storyview",
    "view_storyview",
    "add_like",
    "change_like",
    "delete_like",
    "view_like",
    "add_advertisement",
    "change_advertisement",
    "delete_advertisement",
    "view_advertisement",
    "add_imagetag",
    "change_imagetag",
    "delete_imagetag",
    "view_imagetag",
    "add_upload",
    "change_upload",
    "delete_upload",
    "view_upload",
    "add_export",
    "change_export",
    "delete_export",
    "view_export",
    "add_reportpost",
    "change_reportpost",
    "delete_reportpost",
    "view_reportpost",
]


def get_or_create_teacher_user_group():
    teacher_group, created = Group.objects.get_or_create(name="teacher_group")
    if created:
        for permission_codename in TEACHER_PERMISSIONS_CODENAMES:
            teacher_group.permissions.add(Permission.objects.get(codename=permission_codename))
    return teacher_group


def create_teacher_user_and_add_to_group(group):
    user, created = User.objects.get_or_create(username="Teacher",
                                               defaults={"email": "teacher@admin.com", "is_staff": True})
    if created:
        user.set_password("teacherPassword")
        user.groups.add(group)
        user.save()


def get_or_create_restricted_user_group():
    restricted_group, created = Group.objects.get_or_create(name="restricted_group")
    return restricted_group
