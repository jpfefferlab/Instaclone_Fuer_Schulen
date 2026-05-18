# InstaClone Deployment

This directory contains infrastructure-as-code for deploying InstaClone to cloud or on-premises environments.

- `terraform/` — Hetzner Cloud infrastructure provisioning (servers, network, load balancer)
- `ansible/` — Configuration management and application deployment (Docker, Compose stacks)

> **Scope:** This is a proof-of-concept deployment targeting Hetzner Cloud with a single DB node and
> one or more stateless backend nodes. It is not hardened for production (see [Known Limitations](#known-limitations)).

---

## Architecture Overview

```
Internet
    │ HTTP :80
    ▼
Hetzner Load Balancer (lb11)
    │ label_selector: service=backend
    ▼
instaclone-backend-N  (one or more, public IP + private 172.16.0.1x/24)
    ├── nginx          → reverse-proxies /api + /admin to backend:8000, / to frontend:5173
    ├── instaclone-backend  (Django / Gunicorn)
    └── instaclone-frontend (React / Vite)

instaclone-db-0  (private IP 172.16.0.2 only — no public exposure)
    ├── postgres:13
    └── redis (keydb)
```

All backend ↔ database traffic travels over the private Hetzner network (`172.16.0.0/24`).
The database node has **no publicly accessible ports**.

### Object Storage (S3)

InstaClone uses S3-compatible object storage for post/story image uploads. For Hetzner Cloud deployments,
we recommend **Hetzner Object Storage** which provides:

- S3-compatible API
- Public URLs for stored objects: `https://<bucket>.<location>.your-objectstorage.com/<object>`
- No additional infrastructure to manage
- Automatic HTTPS

The Terraform configuration automatically creates an S3 bucket and configures Ansible with the credentials.

### Health check

The Hetzner Load Balancer currently uses `GET /` with an expected HTTP 200 response as its health check
(`deployment/terraform/load_balancer.tf`). This hits the frontend, which is acceptable for a proof-of-concept.
For production, add a dedicated lightweight endpoint (e.g. `GET /api/health/`) and update the LB service accordingly.

---

## Stack Components

| Component           | Image / Source         | Notes                                                           |
| ------------------- | ---------------------- | --------------------------------------------------------------- |
| nginx               | `nginx:stable-alpine`  | Reverse proxy, static/media files                               |
| instaclone-backend  | built from `backend/`  | Django 5 + Gunicorn, `WEB_CONCURRENCY` auto-set from vCPU count |
| instaclone-frontend | built from `frontend/` | React + Vite                                                    |
| postgres            | `postgres:13`          | Schema-per-tenant via `django-tenants`                          |
| redis               | `eqalpha/keydb:latest` | Django Channels layer                                           |

### Backend environment variables

The backend reads the following from its `.env` file (rendered by Ansible from `templates/backend.env.j2`):

| Variable                   | Source                          | Description                                                    |
| -------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `SECRET_KEY`               | `secrets.yml` (generated)       | Django secret key — never hardcode                             |
| `DB_NAME`                  | `group_vars/backend.yml`        | PostgreSQL database name                                       |
| `DB_USER`                  | `group_vars/backend.yml`        | PostgreSQL user                                                |
| `DB_PASSWORD`              | `secrets.yml` (generated)       | PostgreSQL password                                            |
| `DB_HOST`                  | `group_vars/backend.yml`        | DB private IP (`172.16.0.2`)                                   |
| `DB_PORT`                  | `group_vars/backend.yml`        | `5432`                                                         |
| `ALLOWED_HOSTS`            | `group_vars/backend.yml`        | `"*"` by default — see [Known Limitations](#known-limitations) |
| `DEBUG`                    | `group_vars/backend.yml`        | `"False"` for deployment                                       |
| `WEB_CONCURRENCY`          | Ansible fact                    | Set to `ansible_processor_vcpus` at deploy time                |
| `TZ`                       | `group_vars/backend.yml`        | `Europe/Berlin`                                                |
| `AWS_STORAGE_BUCKET_NAME`  | `group_vars/s3.yml` (Terraform) | S3 bucket for post/story images                                |
| `AWS_S3_ACCESS_KEY_ID`     | `group_vars/s3.yml` (Terraform) | S3 access key                                                  |
| `AWS_S3_SECRET_ACCESS_KEY` | `group_vars/s3.yml` (Terraform) | S3 secret key                                                  |
| `AWS_S3_ENDPOINT_URL`      | `group_vars/s3.yml` (Terraform) | Custom endpoint (e.g., `https://nbg1.your-objectstorage.com`)  |
| `AWS_S3_REGION_NAME`       | `group_vars/s3.yml` (Terraform) | Bucket region/location (e.g., `nbg1`)                          |
| `AWS_S3_USE_SSL`           | `group_vars/s3.yml` (Terraform) | `true` for Hetzner Object Storage                              |
| `AWS_S3_VERIFY`            | `group_vars/s3.yml` (Terraform) | `true` for Hetzner Object Storage                              |
| `AWS_S3_ADDRESSING_STYLE`  | `group_vars/s3.yml` (Terraform) | `path` for Hetzner Object Storage                              |

The backend does **not** currently read `SECRET_KEY` from the environment by default —
`backend/InstaClone/settings.py` has a hardcoded fallback. For a real deployment you should patch
`settings.py` to read `SECRET_KEY = os.environ["SECRET_KEY"]` and remove the insecure default.

### Tenant setup

InstaClone uses `django-tenants` (schema-per-tenant PostgreSQL). On first startup `scripts/init_django.py`
runs `migrate_schemas` and creates the `public` schema with a default admin user. The tenant domain
is hardcoded to `dev.instaclone.de` in that script — update it before deploying to a different domain.

After deployment, create a tenant for your domain manually:

```bash
docker exec -it instaclone-backend python manage.py create_tenant \
  --schema_name=main \
  --name="Main" \
  --domain-domain=your.domain.example \
  --domain-is_primary=True
```

Then create the teacher (staff) user inside that tenant:

```bash
docker exec -it instaclone-backend python manage.py tenant_command create_teacher_user \
  --schema=main
```

---

## Prerequisites

### For Hetzner Cloud (Terraform + Ansible)

- [OpenTofu](https://opentofu.org/) or Terraform ≥ 1.5
- Ansible ≥ 2.14 with the `community.docker` collection:
  ```bash
  ansible-galaxy collection install community.docker
  ```
- A Hetzner Cloud account and an API token (Project → Security → API Tokens)
- An SSH key **already uploaded** to Hetzner Cloud (Project → Security → SSH Keys).
  Note the key name or numeric ID — you will need it in `terraform/terraform.tfvars`.

### For on-premises / manual

- A Linux host with Docker Engine and the Compose plugin installed
- SSH access to the host

---

## Hetzner Cloud Deployment

### 1. Provision infrastructure with Terraform

```bash
cd deployment/terraform
# edit terraform.tfvars directly
```

Edit `terraform.tfvars` and set your Hetzner SSH key name/ID:

```hcl
hetzner_ssh_key_ids = ["your-key-name-or-id"]
```

To find your key name/ID:

- Hetzner Cloud Console → Project → Security → SSH Keys
- Or via CLI: `hcloud ssh-key list`

Set your Hetzner API token (do **not** commit this):

```bash
export TF_VAR_hcloud_token="your-hetzner-api-token"
```

#### Configure Hetzner Object Storage (S3)

Generate S3 credentials in Hetzner Console:

1. Go to **Security** → **S3 Credentials** → **Generate credentials**
2. Enter a description (e.g., "instaclone-production")
3. Copy the **access key** and **secret key** immediately (secret key is shown only once)

Set the credentials as environment variables (do **not** commit these):

```bash
export TF_VAR_s3_access_key="your-s3-access-key"
export TF_VAR_s3_secret_key="your-s3-secret-key"
```

Optionally, customize the bucket name and location in `terraform.tfvars`:

```hcl
s3_location    = "nbg1"        # Options: fsn1, nbg1, hel1
s3_bucket_name = "instaclone"  # Must be globally unique across all Hetzner users
```

#### Apply

```bash
tofu init
tofu apply
```

This provisions:

- One DB node (`instaclone-db-0`, private network only)
- One or more backend nodes (`instaclone-backend-N`, public + private)
- A private network `172.16.0.0/24`
- An `lb11` load balancer targeting backend nodes by label
- An S3 bucket in Hetzner Object Storage

It also writes automatically:

- `../ansible/inventory.ini` — server IPs for Ansible
- `../ansible/group_vars/s3.yml` — S3 configuration (credentials, endpoint, bucket)

To scale backends, change `backend_count` in `terraform.tfvars` and re-apply.

### 2. Build and export Docker images

The Ansible deployment ships image tarballs to remote hosts (no registry required).
Build and export from the repo root:

```bash
docker compose build instaclone-backend instaclone-frontend

docker save idp-angelina-voggenreiter-instaclone-app-instaclone-backend:latest \
  -o deployment/ansible/instaclone_backend.tar

docker save idp-angelina-voggenreiter-instaclone-app-instaclone-frontend:latest \
  -o deployment/ansible/instaclone_frontend.tar
```

These tarballs are gitignored and must be regenerated after every code change.
Once instaclone is properly released to a container registry, the ansible config
may be adapted to fetch these images directly from the registry.

### 3. Generate secrets

```bash
cd deployment/ansible
ansible-playbook generate_secrets.yml
```

This writes `secrets.yml` (mode 0600, gitignored) containing:

- `postgres_password` — a random 32-character alphanumeric password
- `django_secret_key` — a random 64-character key

Run this once per environment. To rotate secrets, delete `secrets.yml` and re-run.

### 4. Deploy

```bash
cd deployment/ansible
make deploy
```

Or deploy individual layers:

```bash
make deploy-db       # postgres + redis only
make deploy-backend  # nginx + backend + frontend only
```

What Ansible does per role:

- Installs Docker Engine on the remote host (Debian)
- Copies the Compose file, nginx config, scripts, and image tarballs
- Templates the `.env` file with secrets and config
- Starts the stack with `docker compose up`

### Maintenance / DEX CLI

For executing commands on the remote host system, we include the docker execute
command for managing things like new tenant creation.

```bash
λ ./dex python manage.py create_tenant --schema_name=hlb --name="Hlb" --domain-domain=167.235.110.98 --domain-is_primary=True
[WARNING]: Host 'instaclone-backend-0' is using the discovered Python interpreter at '/usr/bin/python3.13', but future installation of another Python interprete
r could cause a different interpreter to be discovered. See https://docs.ansible.com/ansible-core/2.19/reference_appendices/interpreter_discovery.html for more
information.
    [
        === Starting migration,
        Operations to perform:,
          Apply all migrations: account, admin, auth, authtoken, contenttypes, export, post, report, rewards, sessions, tenants, upload, user, workbook,
        Running migrations:,
          Applying contenttypes.0001_initial...,
         OK,
          Applying auth.0001_initial...,
         OK,
          Applying account.0001_initial...,
         OK,
          Applying account.0002_email_max_length...,
         OK,
          Applying account.0003_alter_emailaddress_create_unique_verified_email...,
         OK,
          Applying account.0004_alter_emailaddress_drop_unique_email...,
         OK,
          Applying account.0005_emailaddress_idx_upper_email...,
         OK,
          Applying account.0006_emailaddress_lower...,
         OK,
          Applying account.0007_emailaddress_idx_email...,
         OK,
          Applying account.0008_emailaddress_unique_primary_email_fixup...,
         OK,
          Applying account.0009_emailaddress_unique_primary_email...,
         OK,
          Applying admin.0001_initial...,
         OK,
          Applying admin.0002_logentry_remove_auto_add...,
         OK,
          Applying admin.0003_logentry_add_action_flag_choices...,
         OK,
          Applying contenttypes.0002_remove_content_type_name...,
         OK,
          Applying auth.0002_alter_permission_name_max_length...,
         OK,
          Applying auth.0003_alter_user_email_max_length...,
         OK,
          Applying auth.0004_alter_user_username_opts...,
         OK,
          Applying auth.0005_alter_user_last_login_null...,
         OK,
          Applying auth.0006_require_contenttypes_0002...,
         OK,
          Applying auth.0007_alter_validators_add_error_messages...,
         OK,
          Applying auth.0008_alter_user_username_max_length...,
         OK,
          Applying auth.0009_alter_user_last_name_max_length...,
         OK,
          Applying auth.0010_alter_group_name_max_length...,
         OK,
          Applying auth.0011_update_proxy_permissions...,
         OK,
          Applying auth.0012_alter_user_first_name_max_length...,
         OK,
          Applying authtoken.0001_initial...,
         OK,
          Applying authtoken.0002_auto_20160226_1747...,
         OK,
          Applying authtoken.0003_tokenproxy...,
         OK,
          Applying authtoken.0004_alter_tokenproxy_options...,
         OK,
          Applying export.0001_initial...,
         OK,
          Applying post.0001_initial...,
         OK,
          Applying post.0002_advertisement...,
         OK,
          Applying post.0003_alter_comment_created_on_alter_like_created_on_and_more...,
         OK,
          Applying post.0004_remove_story_expiration_time_remove_story_is_deleted...,
         OK,
          Applying post.0005_advertisement_gender_advertisement_interests_and_more...,
         OK,
          Applying post.0006_alter_advertisement_gender...,
         OK,
          Applying post.0007_alter_advertisement_gender...,
         OK,
          Applying post.0008_advertisement_target_age_none...,
         OK,
          Applying post.0009_advertisement_no_interests...,
         OK,
          Applying post.0010_alter_action_options_alter_advertisement_options_and_more...,
         OK,
          Applying post.0011_alter_advertisement_interests...,
         OK,
          Applying post.0012_alter_hashtag_options...,
         OK,
          Applying post.0013_imagetag...,
         OK,
          Applying post.0014_post_content_preview...,
         OK,
          Applying post.0015_rename_x_position_imagetag_x_and_more...,
         OK,
          Applying post.0016_alter_advertisement_keyword...,
         OK,
          Applying post.0017_post_content_upload_and_migrate_images_to_s3...,
         OK,
```

---

## On-Premises / Manual Deployment

For a single-host deployment without Terraform/Ansible, use the root `docker-compose.yaml` directly.

### 1. Configure environment

Create a `.env` file in the repo root (never commit this):

```env
TZ=Europe/Berlin
DB_NAME=instaclone
DB_USER=instaclone
DB_PASSWORD=<strong-random-password>
SECRET_KEY=<strong-random-secret>
ALLOWED_HOSTS=*
DEBUG=False
WEB_CONCURRENCY=3

# S3-compatible object storage for post/story image uploads.
# Remove or leave these unset to fall back to the bundled MinIO defaults
# (suitable for local dev only — not for production).
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_ACCESS_KEY_ID=AKIA…
AWS_S3_SECRET_ACCESS_KEY=…
# Leave AWS_S3_ENDPOINT_URL empty (or unset) to use the standard AWS endpoint.
# Set it to a custom URL for other S3-compatible providers (e.g. Hetzner Object Storage,
# Cloudflare R2, Backblaze B2).
AWS_S3_ENDPOINT_URL=
AWS_S3_REGION_NAME=eu-central-1
AWS_S3_USE_SSL=true
AWS_S3_VERIFY=true
# Use 'virtual' for AWS (default), 'path' for MinIO and most S3-compatible providers.
AWS_S3_ADDRESSING_STYLE=virtual
```

Generate strong values:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"  # for SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(16))"      # for DB_PASSWORD
```

### 2. Build and start

```bash
docker compose up --build -d
```

### 3. Create a tenant and users

```bash
# Create the main tenant (replace with your actual domain)
docker exec -it instaclone-backend python manage.py create_tenant \
  --schema_name=main \
  --name="Main" \
  --domain-domain=localhost \
  --domain-is_primary=True

# Create the teacher account (staff user for moderation + workbook management)
docker exec -it instaclone-backend python manage.py tenant_command create_teacher_user \
  --schema=main
```

### Nginx static files URL

The backend serves static files at `/statics/` (note the trailing `s`). The nginx config
proxies this to `/var/www/static/`. Run `collectstatic` if assets are missing:

```bash
docker exec -it instaclone-backend python manage.py collectstatic --noinput
```

---

## Disk Management

Docker build cache and dangling images accumulate over time. After deployment:

```bash
docker system prune -f           # remove stopped containers, dangling images, unused networks
docker system prune -f --volumes # also remove unused volumes (DESTROYS DATA — use with care)
```

Check usage first: `docker system df -v`

---

## Database Backup

A backup script is provided:

```bash
chmod +x scripts/pg-backup.sh
./scripts/pg-backup.sh
```

This dumps all schemas to a `.sql` file. Copy it off the host before performing destructive operations.

---

## Scaling

Generally speaking, the limiting factor for scaling the deployment is the
database. The production load on the DB is quite heavy due to the
recommendation algorithms in use. We recommend vertically scaling the Database
until its no longer practically possible.

The following examples are rough estimates of cost-performance sets on Hetzner:

| DB Nodes | Backend Nodes | Monthly Cost | Parallel Users |
| -------- | ------------- | ------------ | -------------- |
| 1 CPX32  | 4 CPX332      | 84 €         | ~300           |
| 1 CPX64  | 4 CPX64       | 300 €        | ~1200          |
| 1 CCX63  | 8 CPX64       | 925 €        | ~4000          |

> Note: These costs do not include Load-Balancing and Storage

At the point where this is no longer enough, your deployment is
likely handling thousands concurrent users and you may want to either:

- Cluster your Database with read replicas and manage read-pools for DB heavy
  read operations. This comes with the downsides and complications of eventual
  consistency.
- Similarly, you may want to use a different, but compatible, Database such as
  CockroachDB, though this has not been tested
- Lastly, you may want to shard your deployments especially if multi tenancy is
  heavily in use. This may be the most sensible answer for most deployment types
  given that a tenant is usually only about 1 class of students which each lives
  on their own sub-domain.
  Sharding the deployment of this scale will likely benefit from a management
  layer on top of instaclone handling provisioning of tenants. We do not offer
  this yet, so you will need to roll with your own solution.

Backend nodes do not hold any state and may be scaled up independently. The
Redis / Valkey nodes may be scaled horizontally according to their respective
documentation, however in our benchmarks this was not a bottleneck and you will
likely be fine with scaling vertically. Load balancer will likely not be the
limiting factor and if it is, your cloud will very likely scale that for you.

---

## PostgreSQL tuning

When you deploy a database server and want to make the best out of your
available performance, we recommend you tune your PostgreSQL settings using
tools such as [pgtune](https://pgtune.leopard.in.ua/). Given your settings, you
will receive a `postgresql.conf` file that looks something like this:

```bash
# WARNING
# wal_compression = lz4 requires PostgreSQL
# to be compiled with --with-lz4
#
# io_method = io_uring requires PostgreSQL
# to be compiled with --with-liburing

# DB Version: 18
# OS Type: linux
# DB Type: web
# Total Memory (RAM): 4 GB
# CPUs num: 2
# Connections num: 30
# Data Storage: nvme

max_connections = 30
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 1000
work_mem = 27594kB
huge_pages = off
jit = off
wal_compression = lz4
io_method = io_uring
min_wal_size = 1GB
max_wal_size = 4GB
```

To find the size of your database, you can Query it like this
(see `man psql(1)` for more info):

```sql
\l+
```

---

## Known Limitations

This deployment is a **proof of concept**. The following are known gaps for a production-grade setup:

| Item                                    | Current state                           | What to do                                                                                 |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `ALLOWED_HOSTS = "*"`                   | Accepts requests for any hostname       | Set to your actual domain(s) in `group_vars/backend.yml`                                   |
| `host_key_checking = False`             | Ansible skips SSH host key verification | Enable for long-lived environments; acceptable for short-lived Hetzner VMs                 |
| `SECRET_KEY` hardcoded in `settings.py` | Insecure secret exists in code          | Patch `settings.py` to `os.environ["SECRET_KEY"]` with no default                          |
| No HTTPS / TLS termination              | LB serves plain HTTP on port 80         | Add a Hetzner-managed certificate or a Certbot container; update LB to HTTPS               |
| No DB backups scheduled                 | Manual only via `pg-backup.sh`          | Add a cron job or Hetzner snapshot policy                                                  |
| Health check uses `GET /`               | Hits frontend, not a dedicated endpoint | Add `GET /api/health/` to Django and update `load_balancer.tf`                             |
| Single DB node                          | No replication or failover              | Add a replica or use a managed DB service                                                  |
| JWT tokens valid 10 days                | Long-lived, no refresh rotation         | Tune `ACCESS_TOKEN_LIFETIME` in `settings.py`                                              |
| Object storage not configured           | Falls back to local MinIO defaults      | Terraform now provisions Hetzner Object Storage automatically (see S3 configuration above) |
