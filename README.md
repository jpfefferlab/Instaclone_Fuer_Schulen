# InstaClone

A copy of some of Instagrams functionalities for educational purposes.
The repository stores the entire software stack, mainly a Django backend and a
React frontend served via node.
The project is containerized and the containers are deployed using docker compose.

## Project Structure

### backend

Contains all source and configuration files for the backend.
The backend is based on Django and defines the api that the frontend queries.
For this, django-rest-framework is heavily used. Tenants are maintained using
the django-tenants package, which sometimes leads to confusing errors - make
sure that you set up the tenants correctly.
In production, the backend is served using Gunicorn, via a docker container. The
DB is Postgres with a Redis cache with both having their own docker containers
as well.

### frontend

Contains all src and configuration files for the frontend.
The frontend is written in React with heavy use of bootstrap and tailwind for styling.

### scripts

Contains various scripts regarding the setup, mainly `init_django.py` which creates tenants and an admin user if
none exist, as well as using django-rest-frameworks `migrate_schemas` to apply django migrations to each tenant.

Ensure that the domain in `init_django.py` is set correctly, e.g. as `-domain-domain=instaclone.de` or `-domain-domain=dev.instaclone.de`. This is important, so that the frontend and backend communication works properly and you can access the Django admin site.

### Docker

## Setup/Deployment

The `docker-compose.yaml` file defines the services used to run the stack. To simplify usage the explicit Compose profiles have been removed from the repository; you can control which services run either by starting individual services by name or by using the development override file to enable host port mappings when needed.

Use the optional development override file [`docker-compose.dev.yml`](docker-compose.dev.yml:1) to re-enable host port mappings for local development.

When you use Docker in a production environment to update your containers, repeated builds, volume management and caching can cause the disk space to fill up over time.
Explanation of Disk Usage Growth in Docker:

1. Build Cache and Intermediate Images: Every time you run `sudo docker compose up --build`, Docker builds new layers for each instruction in the Dockerfile. If there have been changes, Docker creates new intermediate images (layers) to reflect these changes. Docker doesn't automatically delete old images, which means that over time, older unused images, often referred to as "dangling" images, accumulate and take up space.

2. Stopped Containers: Every time you use `sudo docker compose down`, Docker stops and removes the running containers. However, unless explicitly removed, the images used to start these containers still remain, accumulating over time.

3. Unused Volumes: In Docker, volumes are used to persist data beyond the lifecycle of a container. However, Docker doesn’t automatically remove unused volumes, so they can build up over time. When you remove a volume (e.g. `sudo docker volume rm instaclone-app_postgres`), you clear that storage space. Be careful removing volumes, the data will be lost forever!

### Suggested Disk Management Routine

In order to avoid memory problems, it is good practice to regularly monitor disk usage with `sudo docker system df -v` and free up space not actively needed for current builds. The cleanup should be done AFTER deployment (build). Run cleanup: `sudo docker system prune -f` or `sudo docker system prune -f --volumes` to include unused volumes

### Prod environment (instaclone.de)

Steps:

0. Make backup of main db
   - `chmod +x scripts/pg-backup.sh`
   - `./scripts/pg-backup.sh`
   - (save generated sql file locally, e.g scp)
1. change to the instaclone directory `cd instaclone-app`
2. stop the currently running containers `sudo docker compose down`
3. pull the latest changes `git pull` (enter your credentials or upload an SSH-key)
4. optional (with caution!): remove the database volume `sudo docker volume rm instaclone-app_postgres`
5. build and start the new containers (and detach) `sudo docker compose up --build -d`
   - This step might fail. See common problems below for another way to build the containers silently and start them afterwards
6. optional: "Suggested Disk Management Routine" as written above

Common Problems during step 5:

- ssh disconnects during build multiple times: `ssh_dispatch_run_fatal: Connection to ... port ...: message authentication` due to heavy console output / load
  Possible resolution:
  - Hide build output completely while building `sudo docker compose --progress=quiet build`
    - Caveat: this removes all logs to console. Wait till finished and check `sudo docker images`
  - And then start the containers `sudo docker compose up -d`

### Local development

Two simple options are supported for local development. You can also start individual services by name with basic docker compose commands.

Option A — Run the DB in Docker, run backend & frontend locally (recommended)

- Start only the DB (keeps backend/frontend processes local for faster dev/edit cycles):
  - `sudo docker compose up -d db`
- Change to the `/backend` directory
- Install backend dependencies: `pip install -r requirements.txt`
- Create a local tenant:
  - `python manage.py create_tenant --schema_name=local_tenant --name="Local tenant" --domain-domain=localhost --domain-is_primary=True`
- Create an admin user:
  - `python manage.py tenant_command createadminuser --schema=local_tenant --username admin --password admin --noinput --email admin@admin.com`
- Ensure Django connects to the DB by setting `DB_HOST` as needed (e.g. `export DB_HOST=localhost`) or configure your local run config accordingly
- Start the backend (e.g. `python manage.py runserver`)
- Change to the `/frontend` directory, install dependencies `npm install` and start the frontend `npm run start --max-http-header-size=16384`

Option B — Run the full stack in Docker (ports exposed for development)

- Ports for non-`nginx` services are disabled in [`docker-compose.yaml`](docker-compose.yaml:1) by default to avoid accidental exposure in production.
- Use the development override [`docker-compose.dev.yml`](docker-compose.dev.yml:1) to re-enable host port mappings when you need direct access from the host.
- Start the full stack with development ports:
  - `sudo docker compose -f docker-compose.yaml -f docker-compose.dev.yml up --build`
- Start only DB with the development override (ports enabled):
  - `sudo docker compose -f docker-compose.yaml -f docker-compose.dev.yml up -d db`

### Local S3 storage with MinIO

Post and story images are stored in S3-compatible object storage. The compose stack includes a
[MinIO](https://min.io/) service (`pgsty/minio`) that acts as a local S3 replacement.

#### Quick start (Option B — full Docker stack)

1. Start the stack with the dev override (exposes MinIO ports on the host):
   ```bash
   sudo docker compose -f docker-compose.yaml -f docker-compose.dev.yml up --build
   ```
2. Open the MinIO web console at **http://localhost:9001** (login: `minioadmin` / `minioadmin`).
3. Create a bucket named **`instaclone`** (Buckets → Create Bucket).
4. Add this line to your `.env`:
   ```env
   AWS_S3_PUBLIC_ENDPOINT_URL=http://localhost:9000
   ```
5. Restart the backend: `sudo docker compose restart instaclone-backend`

That's it. The bucket name `instaclone` and all other credentials match the defaults in `settings.py`, so no other variables are needed.

The `minio_data` Docker volume persists the bucket and its objects across restarts — you only need to create the bucket once.

#### Quick start (Option A — local backend process)

Same as above, but start only the DB and MinIO in Docker:

```bash
sudo docker compose -f docker-compose.yaml -f docker-compose.dev.yml up -d db minio
```

Then add to your shell (or `.env`):

```env
AWS_S3_ENDPOINT_URL=http://localhost:9000        # backend reaches MinIO on localhost
AWS_S3_PUBLIC_ENDPOINT_URL=http://localhost:9000
```

#### How the two endpoint variables work

| Variable                     | Purpose                                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AWS_S3_ENDPOINT_URL`        | Where **boto3** connects to perform S3 API calls. Default: `http://minio:9000` (Docker-internal).                                                                                                  |
| `AWS_S3_PUBLIC_ENDPOINT_URL` | Hostname rewritten into presigned URLs **returned to the browser**. Defaults to `AWS_S3_ENDPOINT_URL`. Set to `http://localhost:9000` so the browser can reach MinIO through the exposed dev port. |

In production with real AWS S3 leave both unset (or only set `AWS_S3_ENDPOINT_URL`).

#### Connecting to real AWS S3

```env
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_ACCESS_KEY_ID=AKIA…
AWS_S3_SECRET_ACCESS_KEY=…
AWS_S3_ENDPOINT_URL=            # leave empty for AWS; set for other providers (Hetzner, R2, …)
AWS_S3_REGION_NAME=eu-central-1
AWS_S3_USE_SSL=true
AWS_S3_VERIFY=true
```

You can then use the same commands to administer the instance, just prefix them with: `docker compose exec -it instaclone-backend`

Start or rebuild individual services

- Start a single service (detached): `sudo docker compose up -d <service>`
  - Examples:
    - `sudo docker compose up -d db`
    - `sudo docker compose up -d instaclone-backend`
    - `sudo docker compose up -d instaclone-frontend`
- Rebuild and start a service: `sudo docker compose up --build -d <service>`

Notes

- For a production-style run (no development port exposure) use the main compose file only:
  - `sudo docker compose up --build` (or with `-d` to detach)
- If your user is in the docker group you can run the same commands without `sudo`.

#### possible errors and solutions

- django.db.utils.OperationalError: could not translate host name "instaclone-db" to address: No such host is known.

  You have to add a static entry to the host file on Windows. Configure instaclone-db as an alias to localhost:
  1. Open a text editor in Administrator mode.
  2. In the text editor, open the file C:\Windows\System32\drivers\etc\hosts.
  3. Add the line: 127.0.0.1 instaclone-db

- /docker-entrypoint-initdb.d/01-init-db.sh: cannot execute: required file not found

  This could happen due to incorrect line endings in the `01-init-db.sh` file. Change End of Line Sequence to: LF

#### deploy a full 'prod-like' locally (not recommended, but sometimes necessary)

This starts all containers with their configuration for the prod environment (instaclone.de). Do NOT include the development override when you want the prod-like behaviour (the main compose intentionally does not expose non-nginx service ports).

Steps:

1. start all containers via docker compose: `sudo docker compose up --build`
2. connect to the backend container to create a new tenant `sudo docker exec -it instaclone-backend bash`
3. in this bash: run `python manage.py create_tenant --schema_name=local_tenant --name="Local tenant" --domain-domain=localhost --domain-is_primary=True`

## Cloud Deployment

For more information on how to setup instaclone in the cloud, see
[Deployment README](./deployment/README.md).

## Recommended settings during development

- Set the `DEBUG = True` in `/backend/InstaClone/settings.py` for more verbose log output.

## Load tests

- Login to django admin and export users to `backend/locust-load-test/users.csv`
- Remove the first character in the first column of the csv file
- `cd backend/locust-load-test`
- Run locust with `locust --host=http://localhost:8000`
  - Specify how much users you want to simulate
  - they are extracted from the users.csv and automatically logged in when starting the load test
  - newsfeed parameters are set randomly for each user within the load test
- Look at the locust documentation for more information
