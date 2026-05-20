# Core / Auth Domain

## ENUMs

```sql
CREATE TYPE user_role AS ENUM ('institution_admin', 'teacher', 'student');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');
```

## Tables

### institutions
```sql
CREATE TABLE institutions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  code              VARCHAR(20) NOT NULL UNIQUE,  -- Margam-assigned ID used for login
  address           TEXT,
  city              TEXT,
  state             TEXT,
  pincode           VARCHAR(10),
  phone             TEXT,
  email             TEXT,
  logo_url          TEXT,
  status            account_status NOT NULL DEFAULT 'active',
  subscription_ends_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);
```

### users
Unified auth table for all roles. Role-specific data lives in `students`, `teachers` tables.
```sql
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
```

### sessions
```sql
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        TEXT NOT NULL UNIQUE,  -- hashed session token
  ip_address        INET,
  user_agent        TEXT,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

## Relationships
- `users` → `institutions`: many-to-one
- `sessions` → `users`: many-to-one (one user can have multiple active sessions)
- `students.user_id` and `teachers.user_id` → `users.id` (see respective domain files)
