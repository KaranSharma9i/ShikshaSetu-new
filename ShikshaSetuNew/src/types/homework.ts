export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_at: string;
  marks_obtained: number | null;
  feedback: any | null;
  status: 'submitted' | 'scored';
  ai_score: number | null;
  file_url: string | null;
}

export interface HomeworkItem {
  id: string;
  institution_id: string;
  academic_year_id: string;
  class_id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  description: string | null;
  assign_date: string;
  due_date: string;
  total_marks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  file_url: string | null;
  status: 'draft' | 'active' | 'archived';
  submission?: HomeworkSubmission | null;
}
