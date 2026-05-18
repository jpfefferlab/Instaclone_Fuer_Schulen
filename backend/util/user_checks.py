from rest_framework.permissions import BasePermission


def is_teacher_or_staff(user):
    if user.is_authenticated and user.groups.exists():
        return user.groups.filter(name="teacher_group").exists()
    return user.is_staff


class TeacherOrStaff(BasePermission):
    def has_permission(self, request, view):
        return is_teacher_or_staff(request.user)


def is_restricted_user(user):
    if user.is_authenticated and user.groups.exists():
        return user.groups.filter(name="restricted_group").exists()
    return False


class RestrictedUser(BasePermission):
    def has_permission(self, request, view):
        if request.method == "GET" and request.user.is_authenticated:
            return True
        if request.user.is_authenticated and request.user.groups.exists():
            print(request.user.groups)
            return not request.user.groups.filter(name="restricted_group").exists()
        if request.user.is_authenticated:
            return True
        return False
