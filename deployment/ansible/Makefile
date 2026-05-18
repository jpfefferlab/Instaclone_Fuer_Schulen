.PHONY: secrets deploy deploy-db deploy-backend help

help:
	@echo "Usage:"
	@echo "  make secrets        Generate Postgres password (run once per environment)"
	@echo "  make deploy         Deploy all servers (db + all backends)"
	@echo "  make deploy-db      Deploy db server only"
	@echo "  make deploy-backend Deploy backend servers only"

secrets:
	ansible-playbook generate_secrets.yml

deploy:
	ansible-playbook site.yml

deploy-db:
	ansible-playbook site.yml --limit db

deploy-backend:
	ansible-playbook site.yml --limit backend
