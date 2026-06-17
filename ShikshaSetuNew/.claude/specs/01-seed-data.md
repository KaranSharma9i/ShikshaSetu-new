# 01 — Seed Data Specification
## Margam ERP · Gurukul Shikshalaya, Auraiya

> **Purpose:** This document is the single source of truth for populating the Margam database with realistic dummy data for development and demo purposes. Every section maps 1-to-1 to a migration table. Implement in the order listed in §18 to respect all foreign-key constraints.
>
> **Password note:** All user accounts use the plain-text string `Karan123` stored directly in `password_hash` (no hashing for dev seed). Do NOT hash it. Add comment `-- DEV ONLY` in the seeder. Replace with bcrypt/argon2 before staging.

---

## 0. Overview & Counts

| Entity | Count |
|---|---|
| Total users in `users` table | **1 500** |
| Students | 1 400 |
| Teaching staff | 30 |
| Non-teaching staff | 70 |
| Academic year | **2025-26** |
| Classes (grades) | **15** — Nursery, LKG, UKG, Class 1 – Class 12 |
| Total sections | **38** — see §4 |
| Board / Curriculum | **CBSE** |

### Schema note on pre-primary grades
The `classes` table enforces `grade_number BETWEEN 1 AND 13`. Map pre-primary as:

| Class name | `grade_number` |
|---|---|
| Nursery | 1 |
| LKG | 2 |
| UKG | 3 |
| Class 1 | 4 |
| Class 2 | 5 |
| … | … |
| Class 12 | 15 |

> If the migration owner changes the CHECK constraint to allow 0 / negative values for pre-primary, update `grade_number` accordingly and keep this table as the canonical map.

---

## 1. Institution

**Table:** `institutions` — **1 row**

| Column | Value |
|---|---|
| `name` | `Gurukul Shikshalaya` |
| `code` | `GS-AUR-001` |
| `address` | `Civil Lines, Near Collectorate, Auraiya` |
| `city` | `Auraiya` |
| `state` | `Uttar Pradesh` |
| `pincode` | `206122` |
| `phone` | `+91-5683-220101` |
| `email` | `info@gurukulsiksha.edu.in` |
| `logo_url` | `https://fsdqlsbdbbfpqzvrptgk.supabase.co/storage/v1/object/public/institution-logos/gurukul.png` |
| `status` | `active` |
| `subscription_ends_at` | `2026-03-31 00:00:00+05:30` |

---

## 2. Academic Year

**Table:** `academic_years` — **1 row**

| Column | Value |
|---|---|
| `label` | `2025-26` |
| `starts_on` | `2025-04-01` |
| `ends_on` | `2026-03-31` |
| `is_current` | `TRUE` |

---

## 3. Classes

**Table:** `classes` — **15 rows**

| `name` | `grade_number` |
|---|---|
| Nursery | 1 |
| LKG | 2 |
| UKG | 3 |
| Class 1 | 4 |
| Class 2 | 5 |
| Class 3 | 6 |
| Class 4 | 7 |
| Class 5 | 8 |
| Class 6 | 9 |
| Class 7 | 10 |
| Class 8 | 11 |
| Class 9 | 12 |
| Class 10 | 13 |
| Class 11 | 14 |
| Class 12 | 15 |

---

## 4. Sections

**Table:** `sections` — **38 rows**

Section layout reflects real school patterns: pre-primary has fewer divisions, primary/middle have 2, secondary has 3, senior secondary has 4 (2 Science + 2 Commerce streams).

`capacity` = 60 for all sections. `class_teacher_id` filled in §8 after teachers are created.

| Class | Sections | Count | Stream note |
|---|---|---|---|
| Nursery | A | 1 | — |
| LKG | A | 1 | — |
| UKG | A, B | 2 | — |
| Class 1 | A, B | 2 | — |
| Class 2 | A, B | 2 | — |
| Class 3 | A, B | 2 | — |
| Class 4 | A, B | 2 | — |
| Class 5 | A, B | 2 | — |
| Class 6 | A, B | 2 | — |
| Class 7 | A, B | 2 | — |
| Class 8 | A, B | 2 | — |
| Class 9 | A, B, C | 3 | — |
| Class 10 | A, B, C | 3 | — |
| Class 11 | A, B, C, D | 4 | A&B = Science · C&D = Commerce |
| Class 12 | A, B, C, D | 4 | A&B = Science · C&D = Commerce |
| **Total** | | **38** | |

---

## 5. Student Distribution Across Sections

Total **1 400 students** distributed as follows (assign roll numbers 01…N within each section):

| Class | Section(s) | Students per section | Section total |
|---|---|---|---|
| Nursery | A | 30 | 30 |
| LKG | A | 35 | 35 |
| UKG | A, B | 35 each | 70 |
| Class 1 | A, B | 50 each | 100 |
| Class 2 | A, B | 50 each | 100 |
| Class 3 | A, B | 50 each | 100 |
| Class 4 | A, B | 50 each | 100 |
| Class 5 | A, B | 48 each | 96 |
| Class 6 | A, B | 45 each | 90 |
| Class 7 | A, B | 45 each | 90 |
| Class 8 | A, B | 44 each | 88 |
| Class 9 | A, B, C | 42 each | 126 |
| Class 10 | A, B, C | 42 each | 126 |
| Class 11 | A, B, C, D | 36 each | 144 |
| Class 12 | A, B, C, D | 26 each | 104 |
| **Total** | | | **1 399 → round last section to 1 401; adjust Class 12-D to 27** |

> Rounding note: target exactly 1 400. Assign Class 12-D = 27 students; all others as above.

---

## 6. Subjects (CBSE Curriculum)

**Table:** `subjects` — institution-level master list, **30 subjects**

Insert once; reuse across classes via `class_subjects`.

### 6.1 Pre-Primary (Nursery – UKG)

| `name` | `code` |
|---|---|
| English Rhymes & Reading | `PP-ENG` |
| Hindi Varnamala | `PP-HIN` |
| Number Fun (Maths) | `PP-MAT` |
| General Awareness | `PP-GK` |
| Art & Craft | `ART` |
| Physical Activity | `PA` |

### 6.2 Primary (Class 1–5)

| `name` | `code` |
|---|---|
| English | `ENG` |
| Hindi | `HIN` |
| Mathematics | `MAT` |
| Environmental Studies | `EVS` |
| General Knowledge | `GK` |
| Computer Science | `CS` |
| Art & Craft | *(reuse `ART`)* |
| Physical Education | `PE` |

### 6.3 Middle School (Class 6–8, additional subjects)

| `name` | `code` |
|---|---|
| Science | `SCI` |
| Social Science | `SST` |
| Sanskrit | `SAN` |

### 6.4 Secondary (Class 9–10, replaces Science/SST)

| `name` | `code` |
|---|---|
| Physics | `PHY` |
| Chemistry | `CHE` |
| Biology | `BIO` |
| History & Civics | `HIS` |
| Geography | `GEO` |

### 6.5 Senior Secondary — Science Stream (Class 11–12 Sections A & B)

| `name` | `code` |
|---|---|
| Physics (Sr.) | `PHY-SR` |
| Chemistry (Sr.) | `CHE-SR` |
| Biology (Sr.) | `BIO-SR` |
| Mathematics (Sr.) | `MAT-SR` |
| English Core | `ENG-CORE` |
| Informatics Practices | `IP` |

### 6.6 Senior Secondary — Commerce Stream (Class 11–12 Sections C & D)

| `name` | `code` |
|---|---|
| Accountancy | `ACC` |
| Business Studies | `BST` |
| Economics | `ECO` |
| Mathematics (Sr.) | *(reuse `MAT-SR`)* |
| English Core | *(reuse `ENG-CORE`)* |

---

## 7. Class–Subject Mapping

**Table:** `class_subjects`

One row per `(section × subject)` for the 2025-26 academic year. `max_marks = 100` for all rows unless noted. `teacher_id` assigned from §8.

| Class group | Sections | Subjects mapped |
|---|---|---|
| Nursery | A | PP-ENG, PP-HIN, PP-MAT, PP-GK, ART, PA |
| LKG | A | PP-ENG, PP-HIN, PP-MAT, PP-GK, ART, PA |
| UKG | A, B | PP-ENG, PP-HIN, PP-MAT, PP-GK, ART, PA |
| Class 1–5 | A, B | ENG, HIN, MAT, EVS, GK, CS, ART, PE |
| Class 6–8 | A, B | ENG, HIN, MAT, SCI, SST, SAN, CS, PE |
| Class 9–10 | A, B, C | ENG, HIN, MAT, PHY, CHE, BIO, HIS, GEO, CS, PE |
| Class 11–12 Sec A & B | Science | PHY-SR, CHE-SR, BIO-SR, MAT-SR, ENG-CORE, IP |
| Class 11–12 Sec C & D | Commerce | ACC, BST, ECO, MAT-SR, ENG-CORE |

---

## 8. Users — Teaching Staff

**Tables:** `users` (role = `teacher`) + `teachers` — **30 rows each**

`login_id` format: `GS-TCH-<sr padded 3 digits>` e.g. `GS-TCH-001`
`employee_code` format: `TCH<sr padded 3 digits>` e.g. `TCH001`

### 8.1 Teacher Name & Profile List

| Sr | `full_name` | Gender | Specialization | Qualification |
|---|---|---|---|---|
| 1 | Ramesh Kumar Sharma | male | Mathematics | M.Sc., B.Ed. |
| 2 | Sunita Devi Gupta | female | Hindi | M.A. Hindi, B.Ed. |
| 3 | Ajay Pratap Singh | male | Science (Middle) | M.Sc. Physics, B.Ed. |
| 4 | Meena Rani Mishra | female | English | M.A. English, B.Ed. |
| 5 | Vinod Kumar Tiwari | male | Social Science | M.A. History, B.Ed. |
| 6 | Rekha Devi Verma | female | Mathematics | M.Sc. Maths, B.Ed. |
| 7 | Santosh Kumar Yadav | male | Physical Education | M.P.Ed. |
| 8 | Priya Pandey | female | Sanskrit | M.A. Sanskrit, B.Ed. |
| 9 | Rajesh Nath Dubey | male | Physics | M.Sc. Physics, B.Ed. |
| 10 | Savita Singh Chauhan | female | Chemistry | M.Sc. Chemistry, B.Ed. |
| 11 | Dinesh Kumar Awasthi | male | Biology | M.Sc. Biology, B.Ed. |
| 12 | Anita Kumari Srivastava | female | Computer Science | MCA, B.Ed. |
| 13 | Manoj Kumar Patel | male | History & Civics | M.A. History, B.Ed. |
| 14 | Kavita Rani Shukla | female | Geography | M.A. Geography, B.Ed. |
| 15 | Suresh Chandra Bajpai | male | Mathematics (Sr.) | M.Sc. Maths, M.Ed. |
| 16 | Lalita Devi Tripathi | female | English Core | M.A. English, M.Ed. |
| 17 | Harish Kumar Saxena | male | Accountancy | M.Com., B.Ed. |
| 18 | Pushpa Singh | female | Business Studies | MBA, B.Ed. |
| 19 | Umesh Kumar Dwivedi | male | Economics | M.A. Economics, B.Ed. |
| 20 | Geeta Rani Agarwal | female | Hindi | M.A. Hindi, B.Ed. |
| 21 | Rajeev Ranjan Mishra | male | Physics (Sr.) | M.Sc. Physics, M.Ed. |
| 22 | Sudha Devi Pandey | female | Chemistry (Sr.) | M.Sc. Chemistry, M.Ed. |
| 23 | Ashok Kumar Dixit | male | EVS / General Science | M.Sc. Env. Science, B.Ed. |
| 24 | Neha Tripathi | female | Art & Craft | B.F.A., B.Ed. |
| 25 | Sanjay Kumar Singh | male | Computer Science (Sr.) | M.Tech. CS |
| 26 | Renu Yadav | female | Mathematics (Primary) | B.Sc., B.Ed. |
| 27 | Pankaj Kumar Shukla | male | English (Primary) | M.A. English, B.Ed. |
| 28 | Saroj Devi Kushwaha | female | Social Science | M.A. Pol. Science, B.Ed. |
| 29 | Devendra Pratap Rao | male | Biology (Sr.) | M.Sc. Zoology, M.Ed. |
| 30 | Mamta Agarwal | female | Informatics Practices | B.Tech. IT, B.Ed. |

### 8.2 Common Fields (all teachers)

| Field | Value |
|---|---|
| `password_hash` | `Karan123` |
| `status` | `active` |
| `institution_id` | from §1 |
| `phone` | `+91-94150-<sr padded 5 digits>` e.g. `+91-94150-00001` |
| `email` | `tch<sr>@gurukulsiksha.edu.in` |
| `address` | `Auraiya, Uttar Pradesh` |
| `date_of_joining` | TCH001 = `2010-06-01`; increment 4 months per teacher (TCH002 = `2010-10-01`, etc.) |
| `emergency_contact` | `+91-94150-<sr+100 padded 5 digits>` |

### 8.3 Class-Teacher Assignments

Update `sections.class_teacher_id` after inserting teachers.

| Section | Class Teacher (Sr) | login_id |
|---|---|---|
| Nursery-A | TCH024 (Neha Tripathi) | GS-TCH-024 |
| LKG-A | TCH026 (Renu Yadav) | GS-TCH-026 |
| UKG-A | TCH027 (Pankaj Shukla) | GS-TCH-027 |
| UKG-B | TCH023 (Ashok Dixit) | GS-TCH-023 |
| Class 1-A | TCH004 (Meena Mishra) | GS-TCH-004 |
| Class 1-B | TCH020 (Geeta Agarwal) | GS-TCH-020 |
| Class 2-A | TCH002 (Sunita Gupta) | GS-TCH-002 |
| Class 2-B | TCH028 (Saroj Kushwaha) | GS-TCH-028 |
| Class 3-A | TCH008 (Priya Pandey) | GS-TCH-008 |
| Class 3-B | TCH016 (Lalita Tripathi) | GS-TCH-016 |
| Class 4-A | TCH006 (Rekha Verma) | GS-TCH-006 |
| Class 4-B | TCH026 (Renu Yadav) | GS-TCH-026 |
| Class 5-A | TCH027 (Pankaj Shukla) | GS-TCH-027 |
| Class 5-B | TCH023 (Ashok Dixit) | GS-TCH-023 |
| Class 6-A | TCH003 (Ajay Singh) | GS-TCH-003 |
| Class 6-B | TCH005 (Vinod Tiwari) | GS-TCH-005 |
| Class 7-A | TCH012 (Anita Srivastava) | GS-TCH-012 |
| Class 7-B | TCH028 (Saroj Kushwaha) | GS-TCH-028 |
| Class 8-A | TCH001 (Ramesh Sharma) | GS-TCH-001 |
| Class 8-B | TCH013 (Manoj Patel) | GS-TCH-013 |
| Class 9-A | TCH009 (Rajesh Dubey) | GS-TCH-009 |
| Class 9-B | TCH010 (Savita Chauhan) | GS-TCH-010 |
| Class 9-C | TCH011 (Dinesh Awasthi) | GS-TCH-011 |
| Class 10-A | TCH014 (Kavita Shukla) | GS-TCH-014 |
| Class 10-B | TCH019 (Umesh Dwivedi) | GS-TCH-019 |
| Class 10-C | TCH025 (Sanjay Singh) | GS-TCH-025 |
| Class 11-A (Sci) | TCH021 (Rajeev Mishra) | GS-TCH-021 |
| Class 11-B (Sci) | TCH022 (Sudha Pandey) | GS-TCH-022 |
| Class 11-C (Com) | TCH017 (Harish Saxena) | GS-TCH-017 |
| Class 11-D (Com) | TCH018 (Pushpa Singh) | GS-TCH-018 |
| Class 12-A (Sci) | TCH015 (Suresh Bajpai) | GS-TCH-015 |
| Class 12-B (Sci) | TCH029 (Devendra Rao) | GS-TCH-029 |
| Class 12-C (Com) | TCH030 (Mamta Agarwal) | GS-TCH-030 |
| Class 12-D (Com) | TCH007 (Santosh Yadav) | GS-TCH-007 |

> TCH004 is shared across two sections — that's fine; `class_teacher_id` is a soft reference. Teachers without class-teacher duty: none in this list (all 30 are assigned, some teaching multiple sections as subject teachers).

---

## 9. Users — Non-Teaching Staff

**Table:** `users` (role = `institution_admin`) — **70 rows**  
*(No corresponding row in `teachers` table.)*

`login_id` format: `GS-ADM-<sr padded 3 digits>`

### 9.1 Designation Groups

| Sr range | Designation | Count |
|---|---|---|
| 001 | Principal | 1 |
| 002–003 | Vice Principal | 2 |
| 004–008 | Office Clerks | 5 |
| 009–013 | Accountant / Fee Cashier | 5 |
| 014–023 | Lab Assistants (Physics, Chemistry, Bio, CS) | 10 |
| 024–033 | Peons / Office Helpers | 10 |
| 034–043 | Security Guards | 10 |
| 044–053 | Housekeeping / Sweepers | 10 |
| 054–063 | Bus Conductors | 10 |
| 064–070 | Library & IT Support | 7 |

### 9.2 Principal & Vice Principals (named explicitly)

| Sr | `full_name` | Designation |
|---|---|---|
| ADM001 | Dr. Shyam Sundar Pandey | Principal |
| ADM002 | Smt. Usha Rani Sharma | Vice Principal |
| ADM003 | Shri Arvind Kumar Mishra | Vice Principal |

### 9.3 Remaining 67 Staff — Name Generation Rule

Use this deterministic scheme in the seeder:

```
SURNAMES = ['Sharma','Gupta','Singh','Yadav','Verma','Mishra','Tiwari','Pandey',
            'Dubey','Shukla','Srivastava','Patel','Bajpai','Tripathi','Saxena',
            'Dwivedi','Dixit','Kushwaha','Chauhan','Agarwal']

MALE_FIRST   = ['Ram','Shiv','Hari','Suresh','Dinesh','Rakesh','Mahesh','Naresh',
                'Mukesh','Umesh','Ganesh','Rajesh','Santosh','Arvind','Vinod',
                'Anil','Sunil','Pawan','Rohit','Deepak']

FEMALE_FIRST = ['Sunita','Meena','Rekha','Savita','Anita','Kavita','Geeta','Pushpa',
                'Lalita','Sudha','Renu','Saroj','Mamta','Pooja','Shanti',
                'Kiran','Neha','Usha','Seema','Sita']

for sr in 4..70:           # ADM004 – ADM070
    gender     = 'male'   if sr % 2 == 0 else 'female'
    first_name = MALE_FIRST[(sr // 2) % 20]   if male   else FEMALE_FIRST[(sr // 2) % 20]
    surname    = SURNAMES[sr % 20]
    full_name  = first_name + ' ' + surname
```

### 9.4 Common Fields (all non-teaching staff)

| Field | Value |
|---|---|
| `password_hash` | `Karan123` |
| `status` | `active` |
| `phone` | `+91-98970-<sr padded 5 digits>` |
| `email` | `adm<sr>@gurukulsiksha.edu.in` |

---

## 10. Students + Guardians

**Tables:** `users` (role = `student`) + `students` — **1 400 rows each**

`login_id` format: `GS-STU-<sr padded 4 digits>` e.g. `GS-STU-0001`
`student_code` format: `STU<sr padded 4 digits>` e.g. `STU0001`

### 10.1 Name Generation Rule

Guardian and student share the **same surname** (same `sr_no` → same family). Guardian has a parental first name.

```
SURNAMES = ['Sharma','Gupta','Singh','Yadav','Verma','Mishra','Tiwari','Pandey',
            'Dubey','Shukla','Srivastava','Patel','Bajpai','Tripathi','Saxena',
            'Dwivedi','Dixit','Kushwaha','Chauhan','Agarwal',
            'Nishad','Maurya','Lodhi','Rajput','Jatav','Rawat']  # 26 surnames

STU_MALE_FIRST   = ['Aarav','Arjun','Vivaan','Aditya','Vihaan','Sai','Ansh','Dhruv',
                    'Kabir','Rishi','Harsh','Nikhil','Yash','Ayaan','Pranav',
                    'Shubham','Akash','Sumit','Rishabh','Kartik','Tushar','Mohit',
                    'Rohan','Gaurav','Siddharth','Naman','Abhishek','Varun','Rahul','Dev']  # 30

STU_FEMALE_FIRST = ['Aanya','Diya','Isha','Kavya','Priya','Ananya','Riya','Siya',
                    'Shruti','Neha','Pooja','Sneha','Sakshi','Divya','Anjali',
                    'Swati','Muskan','Khushi','Palak','Nidhi','Komal','Simran',
                    'Mansi','Deepika','Prachi','Tanvi','Shreya','Aakanksha','Ritu','Garima']  # 30

GUARDIAN_FIRST   = ['Ramesh','Suresh','Dinesh','Rakesh','Mahesh','Rajesh','Santosh',
                    'Vinod','Anil','Mukesh','Harish','Umesh','Ganesh','Ashok','Arvind',
                    'Pankaj','Sanjay','Ajay','Vijay','Manoj','Deepak','Naresh',
                    'Pramod','Shailesh','Rohit','Amit','Sunil','Akhilesh','Girish','Hemant']  # 30

for sr in 1..1400:
    surname        = SURNAMES[(sr - 1) % 26]
    gender         = 'male' if sr % 2 == 1 else 'female'
    stu_first      = STU_MALE_FIRST[((sr-1) // 2) % 30]  if male  else STU_FEMALE_FIRST[((sr-1) // 2) % 30]
    guardian_first = GUARDIAN_FIRST[(sr - 1) % 30]
    student_name   = stu_first + ' ' + surname
    guardian_name  = guardian_first + ' ' + surname     # ← same surname, different first name
```

### 10.2 Common Student Fields

| Field | Value / Rule |
|---|---|
| `password_hash` | `Karan123` |
| `status` | `active` |
| `date_of_birth` | Nursery DOB year = `2021`; increment 1 year per class up to Class 12 = `2009`. Day = `(sr % 28) + 1`, Month = `(sr % 12) + 1` |
| `gender` | `male` if sr odd, `female` if sr even |
| `blood_group` | Cycle: `A+, B+, O+, AB+, A-, B-, O-, AB-` |
| `address` | Village cycles through: `Auraiya, Achhalda, Bidhuna, Rasulabad, Ajitmal, Dibiyapur, Phaphund, Saurikh` (8 villages, `VILLAGES[(sr-1) % 8]`) |
| `admission_date` | `2025-04-05` |
| `guardian_phone` | `+91-9795` + `sr` padded to 6 digits e.g. `+91-9795000001` |
| `guardian_email` | `NULL` |

---

## 11. Enrollments

**Table:** `enrollments` — **1 400 rows**

| Field | Value |
|---|---|
| `academic_year_id` | from §2 |
| `enrolled_on` | `2025-04-05` |
| `is_active` | `TRUE` |
| `roll_number` | `<class_code><section>-<position within section padded 2 digits>` e.g. `1A-01`, `9C-03`, `N-A-05` (Nursery) |

Assign students to sections sequentially: STU0001–STU0050 → Class 1-A, STU0051–STU0100 → Class 1-B, and so on following §5 distribution table.

---

## 12. Fee Structure

**Tables:** `fee_categories` + `fee_structures` + `fee_installments`

### 12.1 Fee Categories

| `name` | `is_optional` |
|---|---|
| Tuition Fee | FALSE |
| Development Fund | FALSE |
| Computer Lab Fee | FALSE |
| Library Fee | FALSE |
| Examination Fee | FALSE |
| Sports Fee | FALSE |
| Transport Fee | TRUE |

### 12.2 Annual Fee Amounts (INR) per Class Group

| Class group | Tuition | Dev Fund | Computer | Library | Exam | Sports | Transport |
|---|---|---|---|---|---|---|---|
| Nursery – UKG | 8 000 | 1 000 | — | 300 | 500 | 300 | 5 000 |
| Class 1–5 | 12 000 | 2 000 | 1 500 | 500 | 1 000 | 500 | 6 000 |
| Class 6–8 | 15 000 | 2 500 | 2 000 | 500 | 1 200 | 600 | 6 000 |
| Class 9–10 | 18 000 | 3 000 | 2 500 | 600 | 1 500 | 600 | 6 000 |
| Class 11–12 | 22 000 | 3 500 | 3 000 | 700 | 2 000 | 700 | 6 000 |

> Pre-primary does not have Computer Lab Fee — skip that category for Nursery–UKG `fee_structures` rows.

### 12.3 Installment Schedule (same for all)

| `installment_no` | `label` | `due_date` | % of Annual |
|---|---|---|---|
| 1 | Quarter 1 | `2025-04-30` | 25% |
| 2 | Quarter 2 | `2025-07-31` | 25% |
| 3 | Quarter 3 | `2025-10-31` | 25% |
| 4 | Quarter 4 | `2026-01-31` | 25% |

---

## 13. Transport

**Tables:** `drivers` + `vehicles` + `transport_routes` + `student_transport`

### 13.1 Drivers (6)

| Sr | `full_name` | `phone` | `license_number` | `license_expiry` |
|---|---|---|---|---|
| 1 | Ramu Prasad Nishad | +91-9453101001 | UP76-2018-0012345 | 2028-06-30 |
| 2 | Chhote Lal Yadav | +91-9453101002 | UP76-2016-0056789 | 2026-11-15 |
| 3 | Sonu Kumar Lodhi | +91-9453101003 | UP76-2019-0098765 | 2029-03-20 |
| 4 | Kallu Singh Rawat | +91-9453101004 | UP76-2015-0043210 | 2025-09-10 |
| 5 | Babulal Maurya | +91-9453101005 | UP76-2020-0067890 | 2030-01-05 |
| 6 | Sukhdev Prajapati | +91-9453101006 | UP76-2017-0034567 | 2027-08-22 |

### 13.2 Vehicles (6)

| `registration_no` | `model` | `capacity` | `status` | `insurance_expiry` | `fitness_expiry` |
|---|---|---|---|---|---|
| UP76-AB-1234 | Tata Starbus 52 | 52 | active | 2026-03-31 | 2026-01-15 |
| UP76-AB-5678 | Tata Starbus 52 | 52 | active | 2026-03-31 | 2026-01-15 |
| UP76-CD-2341 | Ashok Leyland Lynx 40 | 40 | active | 2025-12-31 | 2025-10-20 |
| UP76-CD-6782 | Ashok Leyland Lynx 40 | 40 | active | 2026-03-31 | 2026-02-10 |
| UP76-EF-4321 | Force Traveller 26 | 26 | active | 2026-06-30 | 2026-04-05 |
| UP76-EF-8765 | Force Traveller 26 | 26 | maintenance | 2025-11-30 | 2025-09-01 |

### 13.3 Transport Routes (6)

| Route name | `start_location` | Stops (JSONB array) | `morning_pickup_time` | `afternoon_drop_time` | Vehicle | Driver |
|---|---|---|---|---|---|---|
| Route A – North Zone | Dibiyapur | `["Dibiyapur","Phaphund","Sadar Chowk","School"]` | 07:00 | 14:30 | UP76-AB-1234 | Ramu Prasad |
| Route B – South Zone | Ajitmal | `["Ajitmal","Rasulabad","Kotwali","School"]` | 07:15 | 14:45 | UP76-AB-5678 | Chhote Lal |
| Route C – East Zone | Achhalda | `["Achhalda","Railway Station","School"]` | 07:10 | 14:35 | UP76-CD-2341 | Sonu Kumar |
| Route D – West Zone | Bidhuna | `["Bidhuna","Bus Stand","School"]` | 07:20 | 14:50 | UP76-CD-6782 | Kallu Singh |
| Route E – City Zone | Sadar Bazar | `["Sadar Bazar","Mandi","School"]` | 07:30 | 14:20 | UP76-EF-4321 | Babulal |
| Route F – Rural Zone | Saurikh | `["Saurikh","Jaswantnagar","School"]` | 07:05 | 15:00 | UP76-EF-8765 | Sukhdev |

### 13.4 Student Transport Assignment

Assign transport to students whose `address` village is **not** `Auraiya` (i.e. `sr % 8 != 1`). That is ~875 of 1 400 students. Map village to route:

| Village | Route |
|---|---|
| Achhalda | Route C |
| Bidhuna | Route D |
| Rasulabad | Route B |
| Ajitmal | Route B |
| Dibiyapur | Route A |
| Phaphund | Route A |
| Saurikh | Route F |

`pickup_stop` = student's village. `drop_stop` = `School`.

---

## 14. Exams

**Tables:** `exams` + `exam_schedules` + `exam_results`

### 14.1 Exam Events

| `name` | `exam_type` | `starts_on` | `ends_on` | `status` |
|---|---|---|---|---|
| Unit Test 1 | unit_test | 2025-07-14 | 2025-07-19 | completed |
| Half Yearly | midterm | 2025-09-22 | 2025-10-03 | completed |
| Unit Test 2 | unit_test | 2025-12-08 | 2025-12-13 | completed |
| Annual Exam | final | 2026-02-16 | 2026-03-05 | scheduled |

### 14.2 Exam Schedules

Seed schedules for **all sections, all applicable subjects**. Timings:

| Exam | `max_marks` | `passing_marks` | Time slot |
|---|---|---|---|
| Unit Test 1 | 25 | 9 | 09:00 – 10:30 |
| Half Yearly | 80 | 27 | 09:00 – 12:00 |
| Unit Test 2 | 25 | 9 | 09:00 – 10:30 |
| Annual Exam | 80 | 27 | 09:00 – 12:00 |

### 14.3 Exam Results

Seed `exam_results` only for **Unit Test 1** and **Half Yearly**. Leave Unit Test 2 and Annual Exam with no result rows.

| Exam | Marks range | Absent rate |
|---|---|---|
| Unit Test 1 | `ROUND(10 + (sr % 16), 2)` (→ 10–25) | Every 20th student (`sr % 20 == 0`) → `is_absent = TRUE`, marks = NULL |
| Half Yearly | `ROUND(35 + (sr % 46), 2)` (→ 35–80) | Every 25th student (`sr % 25 == 0`) → `is_absent = TRUE`, marks = NULL |

`entered_by` = the section's class teacher user_id.

---

## 15. Holidays

**Table:** `holidays` — **13 rows**

| `date` | `name` |
|---|---|
| 2025-08-15 | Independence Day |
| 2025-08-16 | Janmashtami |
| 2025-10-02 | Gandhi Jayanti / Dussehra |
| 2025-10-20 | Diwali |
| 2025-10-21 | Diwali (Second Day) |
| 2025-11-05 | Govardhan Puja |
| 2025-11-15 | Guru Nanak Jayanti |
| 2025-12-25 | Christmas Day |
| 2026-01-14 | Makar Sankranti |
| 2026-01-26 | Republic Day |
| 2026-03-17 | Holi |
| 2026-03-30 | Eid ul-Fitr *(tentative)* |
| 2026-03-31 | Year closing day |

---

## 16. Timetable

**Table:** `timetable`

Seed fully for **Class 9-A** (demo section). Apply same pattern programmatically to all other sections.

School hours: **08:00–14:00**, 6 periods × 45 min, 15-min break after Period 3.  
Saturday: 4 periods only (08:00–11:20).

| Period | Starts | Ends |
|---|---|---|
| 1 | 08:00 | 08:45 |
| 2 | 08:50 | 09:35 |
| 3 | 09:40 | 10:25 |
| *Break* | 10:25 | 10:40 | 
| 4 | 10:40 | 11:25 |
| 5 | 11:30 | 12:15 |
| 6 | 12:20 | 13:05 |

**Class 9-A timetable (subject codes):**

| Day | P1 | P2 | P3 | P4 | P5 | P6 |
|---|---|---|---|---|---|---|
| Monday | PHY | CHE | ENG | MAT | HIN | BIO |
| Tuesday | MAT | PHY | HIN | CS | GEO | ENG |
| Wednesday | CHE | BIO | MAT | HIS | PHY | CS |
| Thursday | ENG | MAT | GEO | PHY | CHE | HIN |
| Friday | HIN | HIS | ENG | BIO | MAT | PE |
| Saturday | PHY | CHE | MAT | ENG | — | — |

---

## 17. Circulars

**Table:** `circulars` — **5 rows**

| `title` | Body summary | `published_at` |
|---|---|---|
| Welcome to New Academic Year 2025-26 | Warm welcome from Principal Dr. Shyam Sundar Pandey. School timings, uniform rules, fee schedule overview. | 2025-04-01 |
| Annual Sports Day – 15 November 2025 | All students to participate. Practice schedule from 1 Nov. Parents invited. | 2025-10-15 |
| Half Yearly Exam Schedule Released | Dates: 22 Sep – 3 Oct 2025. Syllabus attached. Bring admit card daily. | 2025-09-01 |
| Fee Payment Reminder – Quarter 2 | Q2 fees due by 31 July 2025. Pay at school office (cash / UPI). Late fee ₹50/day after due date. | 2025-07-15 |
| Republic Day Celebration – 26 January 2026 | Programme at school ground 9:00 AM. Cultural performances by students. All staff to report by 8:00 AM. | 2026-01-20 |

---

## 18. Implementation Order

Execute seed blocks in this strict sequence:

```
1.  institutions
2.  academic_years
3.  classes
4.  subjects
5.  users          ← non-teaching staff (institution_admin)
6.  users          ← teachers
7.  teachers       ← references users.id from step 6
8.  sections       ← set class_teacher_id from step 7
9.  class_subjects ← references sections + subjects + teachers
10. timetable      ← references sections + class_subjects
11. users          ← students
12. students       ← references users.id from step 11
13. enrollments    ← references students + sections
14. fee_categories
15. fee_structures ← references classes + fee_categories
16. fee_installments ← references fee_structures
17. student_fee_assignments ← references students + fee_structures
18. drivers
19. vehicles
20. transport_routes ← references vehicles + drivers
21. student_transport ← references students + transport_routes
22. exams
23. exam_schedules ← references exams + class_subjects + sections
24. exam_results   ← references exam_schedules + students
25. holidays
26. circulars
```

---

## 19. Validation Queries

Run after seeding to confirm counts and FK integrity:

```sql
-- Row counts
SELECT 'institutions'    AS tbl, COUNT(*) FROM institutions
UNION ALL SELECT 'users',        COUNT(*) FROM users
UNION ALL SELECT 'teachers',     COUNT(*) FROM teachers
UNION ALL SELECT 'students',     COUNT(*) FROM students
UNION ALL SELECT 'enrollments',  COUNT(*) FROM enrollments
UNION ALL SELECT 'sections',     COUNT(*) FROM sections
UNION ALL SELECT 'class_subjects', COUNT(*) FROM class_subjects
UNION ALL SELECT 'holidays',     COUNT(*) FROM holidays;

-- Must be 1400
SELECT COUNT(*) FROM students;

-- Must be 0 — no orphan enrollments
SELECT COUNT(*) FROM enrollments e
LEFT JOIN students s ON s.id = e.student_id
WHERE s.id IS NULL;

-- Must be 0 — all sections have a class teacher
SELECT COUNT(*) FROM sections WHERE class_teacher_id IS NULL AND deleted_at IS NULL;

-- Must be 0 — all deleted_at are NULL in seed
SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL;

-- DEV ONLY: verify plain-text password (remove before staging)
SELECT COUNT(*) FROM users WHERE password_hash != 'Karan123';  -- expect 0
```

---

## 20. Caveats & Open Items

| # | Item | Action needed |
|---|---|---|
| 1 | `grade_number` CHECK constraint allows only 1–13; Nursery=1 to Class 12=15 needs the constraint extended to 1–15 | **Migration owner must ALTER TABLE before seeding pre-primary** |
| 2 | Class 11-B / 12-B both assigned to Science; confirm Commerce stream exists | Adjust §4 section names and §7 subject mapping if school is Science-only |
| 3 | Transport Fee assigned to ~875 students (non-Auraiya village addresses) | Confirm 60% transport ratio with school admin |
| 4 | `student_fee_assignments.waiver_amount` — no waivers seeded | Add waiver rows separately if scholarship data exists |
| 5 | `password_hash = 'Karan123'` — plain text, dev only | Replace with `bcrypt('Karan123', 10)` hash before any staging deploy |
| 6 | Timetable fully seeded for Class 9-A only | Script should loop all 38 sections using same subject-slot mapping |