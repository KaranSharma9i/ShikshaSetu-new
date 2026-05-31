export interface ClassItem {
  id: string;
  name: string;
  grade_number: number;
}

export interface SectionItem {
  id: string;
  name: string;
  class_id: string;
}

export interface StudentListItem {
  id: string; // studentId
  student_code: string;
  roll_number: string | null;
  full_name: string;
  profile_photo_url: string | null;
  class_name: string;
  section_name: string;
  class_id: string;
  section_id: string;
  ai_score: number | null;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  student_code: string;
  full_name: string;
  profile_photo_url: string | null;
  guardian_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  admission_date: string | null;
  guardian_phone: string | null;
  phone?: string | null;
  class_name: string;
  section_name: string;
  roll_number: string | null;
  is_active: boolean;
  class_id?: string;
  section_id?: string;
  institution_id?: string;
}

export interface SubjectMarkItem {
  subject_id: string;
  subject_name: string;
  max_marks: number;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
}

export interface PreviousResultItem {
  id: string;
  class_name: string;
  percentage: string;
  status: "PASS" | "FAIL";
}

export interface AIScoreHistoryPoint {
  date: string; // Formatted like "MMM YY"
  score: number;
}

export interface StudentAIScoreSummary {
  current: number;
  history: AIScoreHistoryPoint[];
  trend: string; // e.g. "+2.4%" or "-1.2%"
  isPositive: boolean;
}
