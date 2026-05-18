from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _

PRIVACY_LIMIT = [
    ("everyone", "Everyone"),
    ("following", "Only Followings"),
    ("noone", "No One")
]

class Profile(models.Model):
    class Gender(models.TextChoices):
        MALE = 'MALE'
        FEMALE = 'FEMALE'
        OTHER = 'OTHER'
        NA = 'NA'

    user = models.OneToOneField(User, related_name="profile", on_delete=models.CASCADE, verbose_name=_("user_singular"))
    picture = models.TextField(_("picture"), null=True, blank=True)
    background_image = models.TextField(_("background picture"), null=True, blank=True)
    bio = models.TextField(_("bio"), null=True, blank=True)
    age = models.PositiveIntegerField(_("age"), null=True, blank=True)
    gender = models.TextField(_("gender"), choices=Gender.choices, default=Gender.NA)
    interests = models.TextField(_("interests"), null=True, blank=True)
    created_on = models.DateTimeField(_("created_on"), auto_now_add=True)

    def __str__(self):
        return self.user.username

    class Meta:
        verbose_name = _("profile_singular")
        verbose_name_plural = _("profile_plural")


class Following(models.Model):
    # user represents the creater of the follow edge
    user = models.ForeignKey(User, related_name="followings", on_delete=models.CASCADE, verbose_name=_("user_singular"))
    #following_user is the target user being followed
    following_user = models.ForeignKey(User, related_name="followers", on_delete=models.CASCADE,
                                       verbose_name=_("user_singular"))
    notification_allowed = models.BooleanField(_("notification_allowed"), default=True)
    created_on = models.DateTimeField(_("created_on"), auto_now_add=True)

    def __str__(self):
        return self.user.username

    class Meta:
        unique_together = ("user", "following_user",)
        verbose_name = _("following_singular")
        verbose_name_plural = _("following_plural")


class Setting(models.Model):
    class NewsfeedAlgorithm(models.TextChoices):
        ALGORITHM_1 = "ALGORITHM_1"  # time based
        ALGORITHM_2 = "ALGORITHM_2"  # like based (popularity)
        ALGORITHM_3 = "ALGORITHM_3"  # edge_rank

    user = models.OneToOneField(User, related_name="settings", on_delete=models.CASCADE,
                                verbose_name=_("user_singular"))
    comment_allowed = models.BooleanField(_("comments_allowed"), default=True)
    allow_tags_from = models.CharField(_("allow_tags_from"), max_length=10, choices=PRIVACY_LIMIT, default="everyone")
    newsfeed_algorithm = models.TextField(_("newsfeed_alg"), choices=NewsfeedAlgorithm.choices, default="ALGORITHM_1")

    # Parameters for Algorithm 3
    newsfeed_post_like_weight = models.FloatField(_("newsfeed_post_like_weight"), default=1)
    newsfeed_post_comment_weight = models.FloatField(_("newsfeed_post_comment_weight"), default=2)
    newsfeed_affinity_like_weight = models.FloatField(_("newsfeed_affinity_like_weight"), default=1)
    newsfeed_affinity_comment_weight = models.FloatField(_("newsfeed_affinity_comment_weight"), default=2)
    newsfeed_affinity_follower_weight = models.FloatField(_("newsfeed_affinity_follower_weight"), default=0)
    newsfeed_time_decay_base_factor = models.FloatField(_("newsfeed_time_decay_base_factor"), default=0.005)

    newsfeed_advertisement_frequency = models.IntegerField(_("newsfeed_advertisement_frequency"), default=5)

    newsfeed_followed_only_mode = models.BooleanField(_("newsfeed_followed_only_mode"), default=False)
    newsfeed_show_own_posts = models.BooleanField(_("newsfeed_show_own_posts"), default=True)

    newsfeed_xray_mode = models.BooleanField(_("newsfeed_xray_mode"), default=False)
    newsfeed_social_graph_mode = models.BooleanField(_("newsfeed_social_graph_mode"), default=False)

    def __str__(self):
        return self.user.username

    class Meta:
        verbose_name = _("settings_singular")
        verbose_name_plural = _("settings_plural")


class History(models.Model):
    """Timpestamps of the last post and story created by the user."""
    user = models.ForeignKey(User, related_name="user_history", on_delete=models.CASCADE, verbose_name=_("user"))
    last_post = models.DateTimeField(blank=True, null=True, verbose_name=_("last_post_created_on"))
    last_story = models.DateTimeField(blank=True, null=True, verbose_name=_("last_story_created_on"))

class Affinity(models.Model):
    from_user = models.ForeignKey(User,
                                     related_name="affinities",  # allows reverse relation to get all affinities of a user
                                     on_delete=models.CASCADE,
                                     verbose_name=_("from_user"))

    to_user = models.ForeignKey(User,
                                     related_name="targeted_affinities",  # no reverse relation needed
                                     on_delete=models.CASCADE,
                                     verbose_name=_("to_user"))

    updated_at = models.DateTimeField(_("updated_at"), auto_now=True)

    affinity_like_count = models.IntegerField(_("affinity_like_count"))
    affinity_comment_count = models.IntegerField(_("affinity_comment_count"))
    follows = models.BooleanField(_("follows_user"))

    class Meta:
        unique_together = ("from_user", "to_user",)
        # constraints that counts are >= 0
        constraints = [
            models.CheckConstraint(
                check=models.Q(affinity_like_count__gte=0),
                name='affinity_like_count_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(affinity_comment_count__gte=0),
                name='affinity_comment_count_non_negative'
            )
        ]
    last_story = models.DateTimeField(blank=True, null=True, verbose_name=_("last_story_created_on"))
