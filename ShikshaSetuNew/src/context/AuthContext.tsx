import { createContext } from "react";
import { Session } from "@supabase/supabase-js";

export type UserRole = "institution_admin" | "teacher" | "student";

export interface InstitutionTheme {
  colors: {
    primary: string;
    primaryAlt: string;
    secondary: string;
    secondaryLight: string;
    charcoal: string;
    steelGray: string;
    lightGray: string;
    cream: string;
    white: string;
    success: string;
    warning: string;
    danger: string;
  };
  fonts: {
    heading: string;
    body: string;
    caption: string;
  };
}

export interface AuthState {
  userId: string | null;
  institutionId: string | null;
  role: UserRole | null;
  fullName: string | null;
  email: string | null;
  session: Session | null;
  isLoading: boolean;
  theme: InstitutionTheme | null;
  institutionName: string | null;
  logoUrl: string | null;
  tagline: string | null;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoaded: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
