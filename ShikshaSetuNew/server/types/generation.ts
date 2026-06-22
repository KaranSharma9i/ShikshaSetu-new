export type QuestionType =
  | 'MCQ'
  | 'VERY_SHORT'
  | 'SHORT'
  | 'LONG'
  | 'CASE_STUDY'
  | 'ASSERTION_REASON';

export const SECTION_ORDER = [
  'MCQ',
  'VERY_SHORT',
  'SHORT',
  'LONG',
  'CASE_STUDY',
  'ASSERTION_REASON'
] as const;

export interface QuestionConfig {
  mcq: number;
  very_short: number;
  short: number;
  long: number;
  case_study: number;
  assertion_reason: number;
}

export type AnswerKey =
  | {
      type: 'OPTION';
      correct_option_index: number;
    }
  | {
      type: 'NUMERIC';
      numeric_value: number;
      numeric_unit: string | null;
      numeric_tolerance_percent: number;
    }
  | {
      type: 'TEXT';
      model_answer: string;
      rubric_points: string[];
    };

export interface SubQuestion {
  question_id?: string;
  question_number: string | number;
  type: QuestionType;
  question: string;
  options?: string[] | null;
  reason?: string;
  answer_key?: AnswerKey | null;
}

export interface GeneratedQuestion {
  question_id?: string;
  question_number: number;
  type: QuestionType;
  question: string;
  options: string[] | null; // only for MCQ/ASSERTION_REASON, null for all others
  sub_questions?: SubQuestion[];
  reason?: string;
  answer_key?: AnswerKey | null;
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
