import { createContext } from "react";
import { Session } from "@supabase/supabase-js";

export type UserRole = "institution_admin" | "teacher" | "student";

export interface AuthState {
  userId: string | null;
  institutionId: string | null;
  role: UserRole | null;
  fullName: string | null;
  email: string | null;
  session: Session | null;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
