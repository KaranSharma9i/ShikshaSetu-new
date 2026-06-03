import React, { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext, AuthState, UserRole } from "../context/AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    institutionId: null,
    role: null,
    fullName: null,
    email: null,
    session: null,
    isLoading: true,
  });

  const fetchUserProfile = async (session: Session | null) => {
    if (!session || !session.user) {
      setAuthState({
        userId: null,
        institutionId: null,
        role: null,
        fullName: null,
        email: null,
        session: null,
        isLoading: false,
      });
      return;
    }

    try {
      const user = session.user;
      let userData: any = null;

      // 1. Try fetching by ID
      const { data: byIdData, error: byIdError } = await supabase
        .from("users")
        .select("id, role, institution_id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (byIdError) {
        console.error("Error fetching user profile by ID:", byIdError);
      }

      if (byIdData) {
        userData = byIdData;
      } else if (user.email) {
        // 2. Fallback to fetching by email
        const { data: byEmailData, error: byEmailError } = await supabase
          .from("users")
          .select("id, role, institution_id, full_name")
          .eq("email", user.email)
          .maybeSingle();
        
        if (byEmailError) {
          console.error("Error fetching user profile by email:", byEmailError);
        }

        if (byEmailData) {
          userData = byEmailData;
        }
      }

      if (userData) {
        const dbRole = userData.role;
        let role: UserRole | null = null;
        
        // Filter out 'driver' role (exist in DB enum but not in app auth/routing)
        if (
          dbRole === "institution_admin" ||
          dbRole === "teacher" ||
          dbRole === "student"
        ) {
          role = dbRole as UserRole;
        }

        setAuthState({
          userId: user.id,
          institutionId: userData.institution_id || null,
          role,
          fullName: userData.full_name || null,
          email: user.email || null,
          session,
          isLoading: false,
        });
      } else {
        // No matching public.users profile found
        setAuthState({
          userId: user.id,
          institutionId: null,
          role: null,
          fullName: null,
          email: user.email || null,
          session,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setAuthState({
        userId: session.user.id,
        institutionId: null,
        role: null,
        fullName: null,
        email: session.user.email || null,
        session,
        isLoading: false,
      });
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Initial session recovery failed, clearing credentials:", error.message);
        // Stale/invalid token in storage, sign out to clear it
        supabase.auth.signOut().catch(() => {});
        fetchUserProfile(null);
      } else {
        fetchUserProfile(session);
      }
    }).catch(err => {
      console.warn("getSession promise rejected:", err);
      supabase.auth.signOut().catch(() => {});
      fetchUserProfile(null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        await fetchUserProfile(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
