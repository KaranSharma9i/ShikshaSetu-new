# Fees Domain

## ENUMs

```sql
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'overdue', 'waived');
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other');
```

## Tables

### fee_categories
Types of fees (tuition, transport, library, etc.).
```sql
CREATE TABLE fee_categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,           -- e.g. 'Tuition Fee', 'Transport Fee'
  description       TEXT,
  is_optional       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, name)
);

CREATE INDEX idx_fee_categories_institution ON fee_categories(institution_id);
```

### fee_structures
Fee amounts defined per class per academic year.
```sql
CREATE TABLE fee_structures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  fee_category_id   UUID NOT NULL REFERENCES fee_categories(id) ON DELETE RESTRICT,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (academic_year_id, class_id, fee_category_id)
);

CREATE INDEX idx_fee_structures_class ON fee_structures(class_id);
CREATE INDEX idx_fee_structures_year ON fee_structures(academic_year_id);
```

### fee_installments
When each portion of the fee is due.
```sql
CREATE TABLE fee_installments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id  UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  installment_no    SMALLINT NOT NULL CHECK (installment_no > 0),
  label             TEXT,                   -- e.g. 'Q1', 'Term 1'
  due_date          DATE NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (fee_structure_id, installment_no)
);

CREATE INDEX idx_fee_installments_structure ON fee_installments(fee_structure_id);
CREATE INDEX idx_fee_installments_due_date ON fee_installments(due_date);
```

### student_fee_assignments
Which fee structure applies to a specific student (allows waivers/custom overrides).
```sql
CREATE TABLE student_fee_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  fee_structure_id  UUID NOT NULL REFERENCES fee_structures(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  custom_amount     NUMERIC(12,2),          -- override amount if different from structure
  waiver_amount     NUMERIC(12,2) DEFAULT 0 CHECK (waiver_amount >= 0),
  waiver_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (student_id, fee_structure_id, academic_year_id)
);

CREATE INDEX idx_student_fee_assignments_student ON student_fee_assignments(student_id);
CREATE INDEX idx_student_fee_assignments_year ON student_fee_assignments(academic_year_id);
```

### fee_payments
Actual payment records per student per installment.
```sql
CREATE TABLE fee_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  installment_id    UUID NOT NULL REFERENCES fee_installments(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  amount_paid       NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
  payment_mode      payment_mode NOT NULL,
  payment_status    payment_status NOT NULL DEFAULT 'paid',
  transaction_ref   TEXT,                   -- UPI ref, cheque no, etc.
  paid_on           DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  receipt_url       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_installment ON fee_payments(installment_id);
CREATE INDEX idx_fee_payments_paid_on ON fee_payments(paid_on);
CREATE INDEX idx_fee_payments_status ON fee_payments(payment_status);
```

## Relationships
- `fee_categories` → `institutions`
- `fee_structures` → `institutions`, `academic_years`, `classes`, `fee_categories`
- `fee_installments` → `fee_structures`
- `student_fee_assignments` → `students`, `fee_structures`, `academic_years`
- `fee_payments` → `students`, `fee_installments`, `academic_years`

## Fee Reminder Logic
Query overdue installments where no `fee_payments` record exists with `payment_status = 'paid'`
for a student, and `due_date < CURRENT_DATE`. This drives the student-facing fee reminder.
