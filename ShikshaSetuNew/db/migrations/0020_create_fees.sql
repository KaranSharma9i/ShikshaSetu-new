-- Migration: 0020_create_fees.sql
-- ------------------------------------------------------------
-- Fee structures and payments tables for the Margam ERP platform
-- ------------------------------------------------------------

CREATE TABLE fee_structures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  fee_name          TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  due_date          DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, academic_year_id, class_id, fee_name)
);

CREATE INDEX idx_fee_structures_institution ON fee_structures(institution_id);
CREATE INDEX idx_fee_structures_academic_year ON fee_structures(academic_year_id);
CREATE INDEX idx_fee_structures_class ON fee_structures(class_id);

CREATE TABLE fee_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id  UUID NOT NULL REFERENCES fee_structures(id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  amount_paid       NUMERIC(12,2) NOT NULL,
  payment_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method    TEXT,               -- e.g., "cash", "card", "online"
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (fee_structure_id, student_id)
);

CREATE INDEX idx_fee_payments_fee_structure ON fee_payments(fee_structure_id);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
