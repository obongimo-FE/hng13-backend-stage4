#!/bin/bash
# This script creates databases if they don't exist
# It's safe to run multiple times - errors are ignored if databases already exist

# Create user_db (ignore error if it already exists)
psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE user_db;" || true

# Create template_db (ignore error if it already exists)
psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE template_db;" || true

# Grant permissions (idempotent - safe to run multiple times)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE user_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE template_db TO $POSTGRES_USER;
EOSQL

