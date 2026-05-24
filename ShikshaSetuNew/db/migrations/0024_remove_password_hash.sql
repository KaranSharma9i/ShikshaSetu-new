-- 0024_remove_password_hash.sql
-- Drop password_hash column from users
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Update foreign keys referencing users(id) to support ON UPDATE CASCADE
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_user_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_user_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_class_teacher_id_fkey;
ALTER TABLE sections ADD CONSTRAINT sections_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_teacher_id_fkey;
ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE student_attendance DROP CONSTRAINT IF EXISTS student_attendance_marked_by_fkey;
ALTER TABLE student_attendance ADD CONSTRAINT student_attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_reviewed_by_fkey;
ALTER TABLE leaves ADD CONSTRAINT leaves_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE teacher_attendance DROP CONSTRAINT IF EXISTS teacher_attendance_marked_by_fkey;
ALTER TABLE teacher_attendance ADD CONSTRAINT teacher_attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE circulars DROP CONSTRAINT IF EXISTS circulars_created_by_fkey;
ALTER TABLE circulars ADD CONSTRAINT circulars_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE transport_drivers DROP CONSTRAINT IF EXISTS transport_drivers_user_id_fkey;
ALTER TABLE transport_drivers ADD CONSTRAINT transport_drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
