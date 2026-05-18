import random
from json import JSONDecodeError

from locust import TaskSet, task, between, HttpUser
import logging

USER_CREDENTIALS = [
    # (1, "admin", "instaclone_password"),
]

with open('users.csv', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for line in lines[1:]:
        userid, username, _, _ = line.strip().split(';')

        # username equals password for dummy data
        USER_CREDENTIALS.append((userid, username, username))

class UserBehaviour(TaskSet):
    headers = None
    username = None
    user_id = None
    settings_id = None

    def on_start(self):
        # usernames = ['admin', 'pascal5']
        if len(USER_CREDENTIALS) > 0:
            user_id, user, passw = USER_CREDENTIALS.pop()
            self.username = user
            self.user_id = int(user_id)
            logging.info('Login as %s', user)


            with self.client.post("/api/auth/login/", data={'username': user, 'password': passw},
                                  catch_response=True) as response:
                try:
                    if response.json()['access_token'] is None:
                        response.failure("No access token in response")

                    self.headers = {'Authorization': 'Bearer ' + response.json()['access_token']}

                    if response.json()['user']['settings']['id'] is None:
                        response.failure("No settings id in response")

                    self.settings_id = response.json()['user']['settings']['id']

                except JSONDecodeError:
                    response.failure("Response could not be decoded as JSON")


    # @task(1)
    # def change_newsfeed_settings(self):
        # update newsfeed settings
        payload = {
            "user": self.user_id,
            "newsfeed_algorithm": "ALGORITHM_3",
            "newsfeed_advertisement_frequency": random.randint(0, 20),
            "newsfeed_post_like_weight": random.randint(0, 5),
            "newsfeed_post_comment_weight": random.randint(0, 5),
            "newsfeed_affinity_like_weight": random.randint(0, 5),
            "newsfeed_affinity_comment_weight": random.randint(0, 5),
            "newsfeed_affinity_follower_weight": random.randint(-5, 5),
            "newsfeed_time_decay_base_factor": random.uniform(0, 1),
            "newsfeed_show_own_posts": random.choice([True, False]),
            "newsfeed_followed_only_mode": random.choice([True, False]),
            "newsfeed_xray_mode": True,
            "newsfeed_social_graph_mode": True
        }
        endpoint = "/api/user-settings/" + str(self.settings_id) + "/"

        with self.client.put(endpoint, headers=self.headers, data=payload, catch_response=True) as response:
            logging.info('Updating newsfeed settings of %s with user id %s', self.username, self.user_id)

            if response.status_code == 200:
                logging.info('Updated newsfeed settings of %s', self.username)
            else:
                response.failure("Failed to update settings")

    @task(1)
    def access_feed(self):
        page = 1

        # Browse through feed
        while page is not None and page < 5:
            with self.client.get("/api/feed/?page=" + str(page), headers=self.headers, catch_response=True) as response:
                # print(response.content)

                try:
                    nextPageString = response.json()['next']

                    if nextPageString is not None:
                        page = int(nextPageString.split("page=")[1])
                    else:
                        break
                except KeyError:
                    break
                except JSONDecodeError:
                    page = None

                try:
                    results = response.json()['results']
                    logging.info('Loaded %s posts in page %s for user %s', len(results), page, self.username)
                except JSONDecodeError:
                    response.failure("Response could not be decoded as JSON")

class User(HttpUser):
    tasks = [UserBehaviour]
    wait_time = between(1.5, 5)
