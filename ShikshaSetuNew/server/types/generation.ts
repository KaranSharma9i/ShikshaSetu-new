export type QuestionType =
  | 'MCQ'
  | 'VERY_SHORT'
  | 'SHORT'
  | 'LONG'
  | 'CASE_STUDY'
  | 'ASSERTION_REASON';

export interface QuestionConfig {
  mcq: number;
  very_short: number;
  short: number;
  long: number;
  case_study: number;
  assertion_reason: number;
}

export interface SubQuestion {
  question_number: string | number;
  type: QuestionType;
  question: string;
  options?: string[] | null;
}

export interface GeneratedQuestion {
  question_number: number;
  type: QuestionType;
  question: string;
  options: string[] | null; // only for MCQ, null for all others
  sub_questions?: SubQuestion[];
  reason?: string;
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

export interface GenerateHomeworkRequest {
  grade: string;           // e.g. "Class 8"
  subject: string;         // e.g. "Mathematics"
  title: string;           // e.g. "Algebra — Quadratic Equations"
  topic_description: string;
  question_config: QuestionConfig;
  teacher_id: string;
  class_id: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  institution_id: string;
  academic_year_id: string;
  due_date: string;        // ISO date string
  difficulty: 'Easy' | 'Medium' | 'Hard';
  logoUrl?: string | null;
  institutionName?: string | null;
}
