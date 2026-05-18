#!/bin/bash
set -e
#psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "create database $APP_DB"
psql -v ON_ERROR_STOP=1 --username postgres -c 'create database instaclone'

psql -v ON_ERROR_STOP=1 --username postgres -c 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;'
