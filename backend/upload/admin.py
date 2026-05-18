import csv
import sys
import zipfile
from io import StringIO

from django.contrib import admin, messages
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.shortcuts import redirect

from post import models as post_models
from upload import models as upload_models
from user import models as user_models
from workbook import models as workbook_models
from rewards import models as rewards_models
from util import image_utils


# Register your models here.


@admin.register(upload_models.Upload)
class UploadAdmin(admin.ModelAdmin):
    list_display = ("users", "posts", "stories", "likes", "comments", "sections", "exercises", "tasks", "multipleChoiceOptions", "points", "features", "userFeatures", "images")
    MAX_RESOLUTION = 1080

    def message_user(self, *args):
        pass

    def changelist_view(self, request, extra_context=None):
        if not self.model.objects.exists():
            return redirect('admin:%s_%s_add' % (self.model._meta.app_label, self.model._meta.model_name))
        return super().changelist_view(request, extra_context)

    def save_model(self, request, obj, form, change):
        users_list = []
        posts_list = []
        ads_list = []
        stories_list = []
        comments_list = []
        likes_list = []
        sections_list = []
        exercises_list = []
        tasks_list = []
        multipleChoiceOptions_list = []
        points_list = []
        features_list = []
        userFeatures_list = []
        image_files = {}
        try:
            if obj.images.name:
                images = zipfile.ZipFile(obj.images)
                image_files = extract_images(images)
            if obj.users.name:
                check_users_file(obj.users)
                insert_users_file(obj.users, users_list, images=image_files)
            if obj.posts.name:
                check_file(obj.posts, 4)
                insert_file(obj.posts, add_post, posts_list, images=image_files)
            if obj.advertisements.name:
                check_file(obj.advertisements, 11)
                insert_file(obj.advertisements, add_advertisement, ads_list, images=image_files)
            if obj.stories.name:
                check_file(obj.stories, 3)
                insert_file(obj.stories, add_story, stories_list, images=image_files)
            if obj.comments.name:
                check_file(obj.comments, 5)  # 0,1
                insert_file(obj.comments, add_comment, comments_list)
            if obj.likes.name:
                check_file(obj.likes, 4)  # 0,1
                insert_file(obj.likes, add_like, likes_list)
            if obj.sections.name:
                check_file_required(obj.sections, [0])
                insert_sections_file(obj.sections, sections_list)
            if obj.exercises.name:
                check_file_required(obj.exercises, [0, 1])
                insert_exercises_file(obj.exercises, exercises_list)
            if obj.tasks.name:
                check_file_required(obj.tasks, [0, 2])
                insert_tasks_file(obj.tasks, tasks_list, images=image_files)
            if obj.multipleChoiceOptions.name:
                check_file_required(obj.multipleChoiceOptions, [0, 1, 2])
                insert_multipleChoiceOptions_file(obj.multipleChoiceOptions, multipleChoiceOptions_list)
            if obj.points.name:
                check_file(obj.points, 6)
                insert_points_file(obj.points, points_list)
            if obj.features.name:
                check_file_required(obj.features, [0, 2])
                insert_features_file(obj.features, features_list, images=image_files)
            if obj.userFeatures.name:
                check_file(obj.userFeatures, 4)
                insert_userFeatures_file(obj.userFeatures, userFeatures_list)
        except UploadException as ue:
            remove_entries(likes_list, post_models.Like)
            remove_entries(comments_list, post_models.Comment)
            remove_entries(stories_list, post_models.Story)
            remove_entries(ads_list, post_models.Advertisement)
            remove_entries(posts_list, post_models.Post)
            remove_entries(sections_list, workbook_models.Section)
            remove_entries(exercises_list, workbook_models.Exercise)
            remove_entries(tasks_list, workbook_models.Task)
            remove_entries(multipleChoiceOptions_list, workbook_models.MultipleChoiceOption)
            remove_entries(points_list, rewards_models.Points)
            remove_entries(features_list, rewards_models.Feature)
            remove_entries(userFeatures_list, rewards_models.UserFeature)
            for user in users_list:
                user_models.User.objects.get(id=user).delete()
            error_message = 'Upload failed: {}'.format(str(ue))
            messages.set_level(request, messages.ERROR)
            messages.error(request, error_message)
        messages.success(request, 'Upload of file successful')


def remove_entries(obj_list, model_class):
    for obj in obj_list:
        try:
            model_class.objects.filter(**{'id': obj}).delete()
        except model_class.DoesNotExist:
            pass


def extract_images(file):
    # create a dict that holds the images with key of path. Transform images in this method
    images = {}
    for image_path in file.namelist():
        if image_path.endswith("/"):
            continue
        try:
            images[image_path] = image_utils.read_image_as_base64(file.open(image_path), max_resolution=1080)
        except OSError:
            raise ImageFormatException(file.filename, image_path)
    return images


# Checks the format of the given csv file
# len_checks: Expected length of each row
# raises Exception if the expected length does not match the actual length
def check_file(file, len_checks):
    current_file = file.read().decode('utf-8')
    csv.field_size_limit(sys.maxsize)
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    for row in file_csv:
        # check if the rows are long enough
        if len(row) >= len_checks:
            i = 0
            while i < len_checks and row[i] != '':
                if row[i].startswith(' '):
                    raise FormatException(file, row, i + 1)
                i += 1
            if i != len_checks:
                raise FormatException(file, row, -1)
        else:
            raise FormatException(file, row, -1)
    file.seek(0)


def check_users_file(file):
    # * --> mandatory entry
    # Username*, Password*, Name, Surname,Bio, Name_Profile_Picture
    current_file = file.read().decode('utf-8')
    csv.field_size_limit(sys.maxsize)
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    for row in file_csv:
        if len(row) < 2:
            raise FormatException(file, row, -1)
        else:
            if row[0] == "":
                raise FormatException(file, row, 0)
            if row[1] == "":
                raise FormatException(file, row, 1)
    file.seek(0)

# Checks the format of the given csv file
# required_fields: contains the indexes of the required fields
# raises Exception if at least one of the required fields is missing
def check_file_required(file, required_fields):
    # * --> mandatory entry
    # Sections: Title*, Order
    # Exercises: Section*, Title*, Order
    # Tasks: Exercise*, Title, Type*, Image Path, Upper Text, Lower Text, Points, Order, Minimum Answer Length, Correct Answer, Action Type, Target Count
    # MultipleChoiceOptions: Task*, Option*, Is Correct*
    # Feature: Name*, Image Path, Cost*
    current_file = file.read().decode('utf-8')
    csv.field_size_limit(sys.maxsize)
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    for row in file_csv:
        if len(row) < max(required_fields) + 1:  # Ensure row is long enough to contain required fields
            raise FormatException(file, row, -1)

        for index in required_fields:
            if row[index] == "" or row[index].startswith(" "):  # Check if required field is empty or starts with space
                raise FormatException(file, row, index + 1)

    file.seek(0)


def insert_users_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    csv.field_size_limit(sys.maxsize)
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    users = user_models.User.objects.all()
    for row in file_csv:
        try:
            if users.filter(username=row[0]).exists():
                raise DuplicateUserException(file, row)
            else:
                user = user_models.User.objects.create_user(username=row[0], password=row[1])
                addition_list.append(user.id)
                if row[2] != '':
                    user.first_name = row[2]
                if row[3] != '':
                    user.last_name = row[3]
                if row[4] != '':
                    user_models.Profile.objects.filter(user=user).update(bio=row[4])
                if row[5] != '':
                    image_data = kwargs["images"][row[5]]
                    image = image_utils.compress_picture(image_data, 200, 200)
                    user_models.Profile.objects.filter(user=user).update(picture=image)
                user.save()
        except KeyError:
            raise PictureNotFoundException(file, row, row[5])


def insert_file(file, func, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    csv.field_size_limit(sys.maxsize)
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    users = user_models.User.objects.all()
    for row in file_csv:
        try:
            created = False
            user_action = users.get(username=row[0])
            if func == add_post or func == add_story or func == add_advertisement:
                image = kwargs["images"][row[1]]
                if func == add_post:
                    entry, created = func(u_id=user_action.id, image=image, caption=row[2], creation_date=row[3])
                elif func == add_story:
                    entry, created = func(user_action.id, image, row[2])
                else:
                    # Cases for advertisement with and without keyword
                    if len(row) > 11:
                        entry, created = func(u_id=user_action.id, image=image, caption=row[2], creation_date=row[3],
                                              url=row[4], gender=row[5], target_age_low=row[6], target_age_high=row[7],
                                              target_age_none=row[8], interests=row[9], no_interests=row[10],
                                              keyword=row[11])
                    else:
                        entry, created = func(u_id=user_action.id, image=image, caption=row[2], creation_date=row[3],
                                              url=row[4], gender=row[5], target_age_low=row[6], target_age_high=row[7],
                                              target_age_none=row[8], interests=row[9], no_interests=row[10],
                                              keyword=None)
            else:
                user_post = users.get(username=row[1])
                posts = post_models.Post.objects.filter(creator_id=user_post.id, created_on=row[2])
                if not posts.exists():
                    raise PostNotFoundException(file, row, row[1], row[2])
                for post in posts:
                    if func == add_comment:
                        entry, created = func(user_action.id, post.id, row[3], row[4])
                    else:
                        entry, created = func(user_action.id, post.id, row[3])
            if created:
                addition_list.append(entry)
        except ObjectDoesNotExist:
            raise MissingUserException(file, row)
        except KeyError:
            raise PictureNotFoundException(file, row, row[1])
        except IntegrityError:
            raise DuplicateEntryException(file, row)
        except ValidationError:
            raise ValueException(file, row)


def insert_sections_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    sections = workbook_models.Section.objects.all()
    for row in file_csv:
        try:
            if sections.filter(title=row[0]).exists():
                raise DuplicateSectionException(file, row)
            else:
                section, created = workbook_models.Section.objects.update_or_create(
                    title=row[0],
                    order=int(row[1]) if row[1] else workbook_models.Section._meta.get_field('order').default,
                )
                if created:
                    addition_list.append(section.id)
        except (ValidationError, ValueError):
            raise ValueException(file, row)


def insert_exercises_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    sections = workbook_models.Section.objects.all()
    for row in file_csv:
        try:
            section = sections.get(title=row[0])
            exercise, created = workbook_models.Exercise.objects.update_or_create(
                section=section,
                title=row[1],
                order=int(row[2]) if row[2] else workbook_models.Exercise._meta.get_field('order').default,
            )
            if created:
                addition_list.append(exercise.id)
        except ObjectDoesNotExist: # if section does not exist
            raise UploadException(file, row)
        except (ValidationError, ValueError):
            raise ValueException(file, row)


def insert_tasks_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    exercises = workbook_models.Exercise.objects.all()
    for row in file_csv:
        try:
            exercise = exercises.get(title=row[0])
            task, created = workbook_models.Task.objects.update_or_create(
                exercise=exercise,
                title=row[1],
                type=row[2],
                upper_text=row[4],
                lower_text=row[5],
                points=int(row[6]) if row[6] else workbook_models.Task._meta.get_field('points').default,
                order=int(row[7]) if row[7] else workbook_models.Task._meta.get_field('order').default,
            )
            if created:
                addition_list.append(task.id)
                if row[3] != '':
                    task.image_data = kwargs["images"][row[3]]
                if row[8] != '':
                    task.minimum_answer_length = int(row[8])
                if row[9] != '':
                    task.correct_answer = row[9]
                if row[10] != '':
                    task.action_type = row[10]
                if row[11] != '':
                    task.target_count = int(row[11])
                task.save()
        except ObjectDoesNotExist: # if exercise does not exist
            raise UploadException(file, row)
        except KeyError: # if image path is not correct
            raise PictureNotFoundException(file, row, row[3])
        except (ValidationError, ValueError):
            raise ValueException(file, row)


def insert_multipleChoiceOptions_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    tasks = workbook_models.Task.objects.all()
    for row in file_csv:
        try:
            task = tasks.get(title=row[0])
            multipleChoiceOption, created = workbook_models.MultipleChoiceOption.objects.update_or_create(
                task=task,
                option=row[1],
                is_correct = row[2].strip().lower() in ['true', 'yes', 'wahr', 'ja'] # Else it is set to False
            )
            if created:
                addition_list.append(multipleChoiceOption.id)
        except ObjectDoesNotExist: # if task does not exist
            raise UploadException(file, row)
        except (ValidationError, ValueError):
            raise ValueException(file, row)


def insert_points_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    users = user_models.User.objects.all()
    for row in file_csv:
        try:
            user = users.get(username=row[0])
            points, created = rewards_models.Points.objects.update_or_create(
                user=user,
                points_balance=row[1],
                points_earned=row[2],
                points_spent=row[3],
                tasks_completed=row[4],
                total_tasks=row[5]
            )
            if created:
                addition_list.append(points.id)
        except ObjectDoesNotExist: # if user does not exist
            raise UploadException(file, row)
        except (ValidationError, ValueError):
            raise ValueException(file, row)


def insert_features_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    features = rewards_models.Feature.objects.all()
    for row in file_csv:
        try:
            if features.filter(name=row[0]).exists():
                raise DuplicateSectionException(file, row)
            else:
                feature, created = rewards_models.Feature.objects.update_or_create(
                    name=row[0],
                    cost=row[2]
                )
                if created:
                    addition_list.append(feature.id)
                    if row[1] != '':
                        feature.image_data = kwargs["images"][row[1]]
                        feature.save()
        except KeyError: # if image path is not correct
            raise PictureNotFoundException(file, row, row[3])
        except (ValidationError, ValueError):
            raise ValueException(file, row)


def insert_userFeatures_file(file, addition_list, **kwargs):
    current_file = file.read().decode('utf-8')
    file_csv = csv.reader(StringIO(current_file), delimiter=';')
    next(file_csv)
    users = user_models.User.objects.all()
    features = rewards_models.Feature.objects.all()
    for row in file_csv:
        try:
            user = users.get(username=row[0])
            feature = features.get(name=row[1])
            userFeature, created = rewards_models.UserFeature.objects.update_or_create(
                user=user,
                feature=feature,
                is_unlocked=row[2],
                unlocked_at=row[3]
            )
            if created:
                addition_list.append(userFeature.id)
        except ObjectDoesNotExist: # if user or feature does not exist
            raise UploadException(file, row)
        except (ValidationError, ValueError):
            raise ValueException(file, row)


def add_post(u_id, caption, image, creation_date):
    return post_models.Post.objects.update_or_create(creator_id=u_id, caption=caption, content=image,
                                                     created_on=creation_date)


def add_advertisement(u_id, caption, image, creation_date, url, gender, target_age_low, target_age_high,
                      target_age_none, interests, no_interests, keyword):
    if keyword is not None:
        return post_models.Advertisement.objects.update_or_create(creator_id=u_id, caption=caption, content=image,
                                                                  created_on=creation_date, url=url, gender=gender,
                                                                  target_age_low=target_age_low,
                                                                  target_age_high=target_age_high,
                                                                  target_age_none=target_age_none, interests=interests,
                                                                  no_interests=no_interests,
                                                                  keyword=keyword)
    else:
        return post_models.Advertisement.objects.update_or_create(creator_id=u_id, caption=caption, content=image,
                                                                  created_on=creation_date, url=url, gender=gender,
                                                                  target_age_low=target_age_low,
                                                                  target_age_high=target_age_high,
                                                                  target_age_none=target_age_none, interests=interests,
                                                                  no_interests=no_interests)


def add_story(u_id, image, creation_date):
    return post_models.Story.objects.update_or_create(creator_id=u_id, content=image, created_on=creation_date)


def add_comment(u_id, p_id, creation_date, content):
    return post_models.Comment.objects.update_or_create(creator_id=u_id, post_id=p_id, created_on=creation_date,
                                                        content=content)


def add_like(u_id, p_id, creation_date):
    return post_models.Like.objects.update_or_create(creator_id=u_id, post_id=p_id, created_on=creation_date)


class UploadException(Exception):
    file = None
    row = None

    def __init__(self, file, row):
        self.file = file
        self.row = row
        super().__init__(self.file, self.row)


class DuplicateUserException(UploadException):
    def __str__(self):
        return f"A Duplicate User was found in the user file, the second mention is in this line\n {self.row}\n"


class MissingUserException(UploadException):
    def __str__(self):
        return f"A user referenced in file {self.file} was not found, the error was in the following line\n {self.row}\n"


class DuplicateSectionException(UploadException):
    def __str__(self):
        return f"A Duplicate Section was found in the section file, row:\n {self.row}\n"


class FormatException(UploadException):
    def __init__(self, file, row, column):
        super().__init__(file, row)
        self.column = column

    def __str__(self):
        if self.column == -1:
            return f"A mandatory column was missing in the file {self.file}, in this line {self.row}"
        else:
            return f"A format error was found in the file {self.file}, in the following line\n {self.row}," \
                   f" column {self.column}\n"


class ValueException(UploadException):
    def __str__(self):
        return f"A Value error was found in the file {self.file}, in the following row {self.row}, which means that a " \
               f"value did not match the required type"


class PictureNotFoundException(UploadException):

    def __init__(self, file, row, path):
        self.path = path
        super().__init__(file, row)

    def __str__(self):
        return f"An error occurred in file {self.file} at row {self.row}, " \
               f"as there was no picture under the following path:\n {self.path}"


class DuplicateEntryException(UploadException):

    def __str__(self):
        return f"Error in file {self.file} at row {self.row}, as there was already an entry with the exact same values"


class ImageFormatException(UploadException):
    def __str__(self):
        return f"Error in file {self.file} at image {self.row}, as the image uploaded was not a .jpg or .jpeg file"


class PostNotFoundException(UploadException):
    def __init__(self, file, row, username, creation_time):
        self.username = username
        self.creation_time = creation_time
        super().__init__(file, row)

    def __str__(self):
        return f"Error in file {self.file} at row {self.row}, as there is no post by user {self.username} at time {self.creation_time}"
