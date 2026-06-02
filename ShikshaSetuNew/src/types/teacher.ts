export interface TeacherListItem {
  id: string; // teachers.id
  user_id: string;
  employee_code: string;
  full_name: string;
  profile_photo_url: string | null;
  specialization: string; // subject pill tag
  status: string; // Active/Inactive
  performanceScore: number;
  assigned_classes: string[];
}

export interface TeacherProfile {
  id: string;
  user_id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  last_login_at: string | null;
  date_of_birth: string | null;
  gender: string | null;
  qualification: string | null;
  specialization: string | null;
  date_of_joining: string | null;
  address: string | null;
  emergency_contact: string | null;
  profile_photo_url: string | null;
}

export interface SubjectMetric {
  subject: string;
  class: string;
  avgMarks: number;
  aiScore: number;
}

export interface AIScoreHistoryPoint {
  date: string; // Format: "MMM YY" (e.g. "Sep 25")
  score: number;
}

export interface TeacherPerformanceSummary {
  overallScore: number;
  subjectMetrics: SubjectMetric[];
  aiScoreHistory: AIScoreHistoryPoint[];
}

export interface TeacherClass {
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  student_count: number;
  isClassTeacher: boolean;
}
