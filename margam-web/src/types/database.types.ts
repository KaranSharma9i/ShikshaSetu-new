export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = "institution_admin" | "teacher" | "student" | "driver";
export type AccountStatus = "active" | "suspended" | "inactive";

export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string;
          name: string;
          code: string;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          status: string;
          subscription_ends_at: string | null;
          created_at: string;
          updated_at: string;
          theme: any;
          tagline: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          status?: string;
          subscription_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
          theme?: any;
          tagline?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          status?: string;
          subscription_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
          theme?: any;
          tagline?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          institution_id: string;
          role: UserRole;
          login_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          profile_photo_url: string | null;
          status: AccountStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          role: UserRole;
          login_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          profile_photo_url?: string | null;
          status?: AccountStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          role?: UserRole;
          login_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          profile_photo_url?: string | null;
          status?: AccountStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          user_id: string;
          student_code: string;
          guardian_name: string | null;
          date_of_birth: string | null;
          gender: string | null;
          blood_group: string | null;
          address: string | null;
          admission_date: string | null;
          guardian_phone: string | null;
          institution_id: string;
          created_at: string;
          updated_at: string;
          plan_tier: Database["public"]["Enums"]["plan_tier_type"];
          tier_expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_code: string;
          guardian_name?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          blood_group?: string | null;
          address?: string | null;
          admission_date?: string | null;
          guardian_phone?: string | null;
          institution_id: string;
          created_at?: string;
          updated_at?: string;
          plan_tier?: Database["public"]["Enums"]["plan_tier_type"];
          tier_expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          student_code?: string;
          guardian_name?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          blood_group?: string | null;
          address?: string | null;
          admission_date?: string | null;
          guardian_phone?: string | null;
          institution_id?: string;
          created_at?: string;
          updated_at?: string;
          plan_tier?: Database["public"]["Enums"]["plan_tier_type"];
          tier_expires_at?: string | null;
        };
      };
      teachers: {
        Row: {
          id: string;
          user_id: string;
          employee_code: string;
          specialization: string | null;
          qualification: string | null;
          gender: string | null;
          date_of_birth: string | null;
          date_of_joining: string | null;
          emergency_contact: string | null;
          address: string | null;
          institution_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_code: string;
          specialization?: string | null;
          qualification?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          date_of_joining?: string | null;
          emergency_contact?: string | null;
          address?: string | null;
          institution_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          employee_code?: string;
          specialization?: string | null;
          qualification?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          date_of_joining?: string | null;
          emergency_contact?: string | null;
          address?: string | null;
          institution_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      circulars: {
        Row: {
          id: string;
          institution_id: string;
          title: string;
          content: string;
          publish_date: string;
          expiry_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          target_roles: string[] | null;
          target_class_id: string | null;
          category: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          title: string;
          content: string;
          publish_date: string;
          expiry_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          target_roles?: string[] | null;
          target_class_id?: string | null;
          category?: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          title?: string;
          content?: string;
          publish_date?: string;
          expiry_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          target_roles?: string[] | null;
          target_class_id?: string | null;
          category?: string | null;
        };
      };
      classes: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          grade_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          grade_number: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          name?: string;
          grade_number?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      sections: {
        Row: {
          id: string;
          class_id: string;
          academic_year_id: string;
          name: string;
          capacity: number;
          class_teacher_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          academic_year_id: string;
          name: string;
          capacity?: number;
          class_teacher_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          academic_year_id?: string;
          name?: string;
          capacity?: number;
          class_teacher_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      academic_years: {
        Row: {
          id: string;
          institution_id: string;
          label: string;
          starts_on: string;
          ends_on: string;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          label: string;
          starts_on: string;
          ends_on: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          label?: string;
          starts_on?: string;
          ends_on?: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          section_id: string;
          academic_year_id: string;
          roll_number: string;
          enrolled_on: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          section_id: string;
          academic_year_id: string;
          roll_number: string;
          enrolled_on?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          section_id?: string;
          academic_year_id?: string;
          roll_number?: string;
          enrolled_on?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      fee_structures: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          class_id: string;
          fee_name: string;
          amount: number;
          due_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          class_id: string;
          fee_name: string;
          amount: number;
          due_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          academic_year_id?: string;
          class_id?: string;
          fee_name?: string;
          amount?: number;
          due_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      fee_payments: {
        Row: {
          id: string;
          fee_structure_id: string;
          student_id: string;
          amount_paid: number;
          payment_date: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fee_structure_id: string;
          student_id: string;
          amount_paid: number;
          payment_date?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fee_structure_id?: string;
          student_id?: string;
          amount_paid?: number;
          payment_date?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      student_attendance: {
        Row: {
          id: string;
          student_id: string;
          class_subject_id: string | null;
          academic_year_id: string;
          date: string;
          status: "present" | "absent" | "late" | "half_day";
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_subject_id?: string | null;
          academic_year_id: string;
          date: string;
          status: "present" | "absent" | "late" | "half_day";
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_subject_id?: string | null;
          academic_year_id?: string;
          date?: string;
          status?: "present" | "absent" | "late" | "half_day";
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      plan_tier_type: "FREE" | "STANDARD" | "PRO";
    };
  };
}
