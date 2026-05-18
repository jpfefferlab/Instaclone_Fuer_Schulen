# Ansible Deployment

Deploys the Instaclone application stack to Hetzner Cloud servers provisioned by Terraform.

## Architecture

```
Internet → Load Balancer (:80)
               ↓ label: service=backend
   instaclone-backend-N  (one per backend_count)
   ├── nginx              (port 80, reverse proxy)
   ├── instaclone-backend
   └── instaclone-frontend

   instaclone-db-0  (172.16.0.2, private network only)
   ├── postgres:13
   └── redis (keydb)
```

## Prerequisites

- Ansible ≥ 2.14
- `community.docker` collection: `ansible-galaxy collection install community.docker`
- Terraform apply completed (generates `inventory.ini`)
- SSH key `~/.ssh/id_rsa` matching the key uploaded to Hetzner

## First-time setup

```bash
# 1. Provision infrastructure
cd ../terraform && tofu apply

# 2. Generate Postgres password (once per environment)
make secrets

# 3. Set the Django secret key in group_vars/backend.yml
#    django_secret_key: "your-secret-key-here"

# 4. Deploy
make deploy
```

## Makefile targets

| Target | Description |
|---|---|
| `make secrets` | Generate `secrets.yml` with a random Postgres password |
| `make deploy` | Deploy all servers (db + all backends) |
| `make deploy-db` | Deploy db server only |
| `make deploy-backend` | Deploy backend servers only |

## File structure

```
ansible/
├── Makefile
├── ansible.cfg                  # Inventory path, SSH config
├── site.yml                     # Master playbook
├── generate_secrets.yml         # One-shot secret generation
├── group_vars/
│   ├── db.yml                   # Postgres/Redis config
│   └── backend.yml              # App config (db host, image names, Django settings)
├── templates/
│   ├── db.env.j2                # .env for the db stack
│   └── backend.env.j2           # .env for the backend stack (WEB_CONCURRENCY auto-set)
├── compose/
│   ├── docker-compose.db.yml    # postgres + redis
│   └── docker-compose.backend.yml # nginx + backend + frontend
└── roles/
    ├── db_deploy/               # Installs Docker, deploys db stack
    └── backend_deploy/          # Installs Docker, loads image tars, deploys app stack
```

## Secrets

`generate_secrets.yml` writes a randomly generated 32-character Postgres password to `secrets.yml` (mode 0600). This file is gitignored and must not be committed. `site.yml` loads it at runtime and injects it into both the db and backend `.env` files.

To rotate the password: delete `secrets.yml`, re-run `make secrets`, and re-run `make deploy`.

## Scaling

Backend servers are scaled by changing `backend_count` in `terraform/variables.tf` (or `terraform.tfvars`) and re-running `tofu apply`. Ansible will automatically target all hosts in the `[backend]` inventory group.

`WEB_CONCURRENCY` is set dynamically in `templates/backend.env.j2` using `{{ ansible_processor_vcpus }}` — no config change needed when scaling to larger server types.
