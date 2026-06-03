export type QuestionType = 'MCQ' | 'VERY_SHORT' | 'SHORT' | 'LONG' | 'CASE_STUDY' | 'ASSERTION_REASON';

export interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  options: string[] | null;
  question_number: number;
}

export interface GeneratedContent {
  questions: GeneratedQuestion[];
  metadata: {
    subject: string;
    grade: string;
    title: string;
    topic: string;
    total_questions: number;
    generated_at: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  };
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_at: string;
  marks_obtained: number | null;
  ai_feedback: any | null;
  status: 'submitted' | 'scored';
  ai_score: number | null;
  attachment_urls: string[] | null;
  file_url: string | null;
}

export interface HomeworkItem {
  id: string;
  institution_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  section_name?: string;
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
  ai_generated?: boolean;
  generated_content?: GeneratedContent | null;
  pdf_url?: string | null;
  generation_status?: 'generating' | 'generated' | 'published' | 'failed' | null;
  question_config?: {
    mcq: number;
    very_short: number;
    short: number;
    long: number;
    case_study: number;
    assertion_reason: number;
  } | null;
  submission?: HomeworkSubmission | null;
  section?: {
    id: string;
    name: string;
  } | null;
}
