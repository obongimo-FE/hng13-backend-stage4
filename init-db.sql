-- Create separate databases for each service
-- Note: This script only runs on first initialization
-- If databases already exist, they will be skipped gracefully

-- Create user_db if it doesn't exist (using psql conditional)
\set ON_ERROR_STOP off
CREATE DATABASE user_db;
\set ON_ERROR_STOP on

-- Create template_db if it doesn't exist
\set ON_ERROR_STOP off
CREATE DATABASE template_db;
\set ON_ERROR_STOP on

-- Grant permissions (idempotent - safe to run multiple times)
GRANT ALL PRIVILEGES ON DATABASE user_db TO hng_user;
GRANT ALL PRIVILEGES ON DATABASE template_db TO hng_user;
