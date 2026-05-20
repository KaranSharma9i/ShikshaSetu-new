# Transport Domain

## ENUMs

```sql
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');
CREATE TYPE transport_assignment_status AS ENUM ('active', 'inactive');
```

## Tables

### drivers
```sql
CREATE TABLE drivers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  license_number    TEXT NOT NULL,
  license_expiry    DATE,
  address           TEXT,
  photo_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_drivers_institution ON drivers(institution_id);
```

### vehicles
```sql
CREATE TABLE vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  registration_no   TEXT NOT NULL UNIQUE,
  model             TEXT,
  capacity          SMALLINT CHECK (capacity > 0),
  status            vehicle_status NOT NULL DEFAULT 'active',
  insurance_expiry  DATE,
  fitness_expiry    DATE,
  gps_device_id     TEXT,                   -- for future GPS integration
  photo_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_vehicles_institution ON vehicles(institution_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
```

### transport_routes
```sql
CREATE TABLE transport_routes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,           -- e.g. 'Route A - North Zone'
  description       TEXT,
  vehicle_id        UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id         UUID REFERENCES drivers(id) ON DELETE SET NULL,
  start_location    TEXT,
  end_location      TEXT,
  stops             JSONB,                   -- ordered list of stop names + times
  morning_pickup_time TIME,
  afternoon_drop_time TIME,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_routes_institution ON transport_routes(institution_id);
CREATE INDEX idx_routes_vehicle ON transport_routes(vehicle_id);
CREATE INDEX idx_routes_driver ON transport_routes(driver_id);
CREATE INDEX idx_routes_academic_year ON transport_routes(academic_year_id);
```

### student_transport
Which student is assigned to which route.
```sql
CREATE TABLE student_transport (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  route_id          UUID NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  pickup_stop       TEXT,                   -- student's boarding stop
  drop_stop         TEXT,                   -- student's alighting stop
  status            transport_assignment_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (student_id, academic_year_id)    -- one route per student per year
);

CREATE INDEX idx_student_transport_student ON student_transport(student_id);
CREATE INDEX idx_student_transport_route ON student_transport(route_id);
CREATE INDEX idx_student_transport_year ON student_transport(academic_year_id);
```

## Relationships
- `drivers` → `institutions`
- `vehicles` → `institutions`
- `transport_routes` → `institutions`, `vehicles`, `drivers`, `academic_years`
- `student_transport` → `students`, `transport_routes`, `academic_years`
