CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  role              user_role NOT NULL,
  login_id          TEXT NOT NULL,         -- school_id+student_id combo for students, assigned id for others
  password_hash     TEXT NOT NULL,         -- bcrypt or argon2 hash, never plain text
  full_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  profile_photo_url TEXT,
  status            account_status NOT NULL DEFAULT 'active',
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, login_id)
);

CREATE INDEX idx_users_institution_id ON users(institution_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_login_id ON users(institution_id, login_id);
