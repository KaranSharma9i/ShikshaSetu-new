-- Create custom ENUM types
CREATE TYPE user_role AS ENUM ('institution_admin', 'teacher', 'student');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');

-- Create institutions table
CREATE TABLE institutions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  code                 VARCHAR(20) NOT NULL UNIQUE,  -- Margam-assigned ID used for login
  address              TEXT,
  city                 TEXT,
  state                TEXT,
  pincode              VARCHAR(10),
  phone                TEXT,
  email                TEXT,
  logo_url             TEXT,
  status               account_status NOT NULL DEFAULT 'active',
  subscription_ends_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ DEFAULT NULL
);
