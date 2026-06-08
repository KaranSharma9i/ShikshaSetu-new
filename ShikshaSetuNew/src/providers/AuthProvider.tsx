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
    theme: null,
    institutionName: null,
    logoUrl: null,
    tagline: null,
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
        theme: null,
        institutionName: null,
        logoUrl: null,
        tagline: null,
      });
      return;
    }

    try {
      const user = session.user;
      let userData: any = null;

      // 1. Try fetching by ID
      const { data: byIdData, error: byIdError } = await supabase
        .from("users")
        .select(`
          id, 
          role, 
          institution_id, 
          full_name,
          institutions (
            name,
            logo_url,
            tagline,
            theme
          )
        `)
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
          .select(`
            id, 
            role, 
            institution_id, 
            full_name,
            institutions (
              name,
              logo_url,
              tagline,
              theme
            )
          `)
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

        // Parse theme safely
        const instRaw = Array.isArray(userData.institutions)
          ? userData.institutions[0]
          : userData.institutions;
        const instThemeRaw = instRaw?.theme;
        const institutionName = instRaw?.name || null;
        const logoUrl = instRaw?.logo_url || null;
        const tagline = instRaw?.tagline || null;

        const defaultColors = {
          primary: "#0D1B2A",
          primaryAlt: "#162A56",
          secondary: "#D4AF37",
          secondaryLight: "#F2C14E",
          charcoal: "#333333",
          steelGray: "#6B7280",
          lightGray: "#E5E7EB",
          cream: "#F7F3EB",
          white: "#FFFFFF",
          success: "#22C55E",
          warning: "#EAB308",
          danger: "#EF4444"
        };

        const defaultFonts = {
          heading: "Poppins",
          body: "Inter",
          caption: "OpenSans"
        };

        const parsedTheme = {
          colors: {
            primary: instThemeRaw?.colors?.primary ?? defaultColors.primary,
            primaryAlt: instThemeRaw?.colors?.primaryAlt ?? defaultColors.primaryAlt,
            secondary: instThemeRaw?.colors?.secondary ?? defaultColors.secondary,
            secondaryLight: instThemeRaw?.colors?.secondaryLight ?? defaultColors.secondaryLight,
            charcoal: instThemeRaw?.colors?.charcoal ?? defaultColors.charcoal,
            steelGray: instThemeRaw?.colors?.steelGray ?? defaultColors.steelGray,
            lightGray: instThemeRaw?.colors?.lightGray ?? defaultColors.lightGray,
            cream: instThemeRaw?.colors?.cream ?? defaultColors.cream,
            white: instThemeRaw?.colors?.white ?? defaultColors.white,
            success: instThemeRaw?.colors?.success ?? defaultColors.success,
            warning: instThemeRaw?.colors?.warning ?? defaultColors.warning,
            danger: instThemeRaw?.colors?.danger ?? defaultColors.danger
          },
          fonts: {
            heading: instThemeRaw?.fonts?.heading ?? defaultFonts.heading,
            body: instThemeRaw?.fonts?.body ?? defaultFonts.body,
            caption: instThemeRaw?.fonts?.caption ?? defaultFonts.caption
          }
        };

        setAuthState({
          userId: user.id,
          institutionId: userData.institution_id || null,
          role,
          fullName: userData.full_name || null,
          email: user.email || null,
          session,
          isLoading: false,
          theme: parsedTheme,
          institutionName,
          logoUrl,
          tagline,
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
          theme: null,
          institutionName: null,
          logoUrl: null,
          tagline: null,
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
        theme: null,
        institutionName: null,
        logoUrl: null,
        tagline: null,
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
