import React, { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { AuthContext, AuthState, UserRole } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
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

        const newProfile = {
          role,
          fullName: userData.full_name || null,
          theme: parsedTheme,
          institutionName,
          logoUrl,
          tagline,
          institutionId: userData.institution_id || null,
        };

        try {
          await AsyncStorage.setItem(`user_profile_${user.id}`, JSON.stringify(newProfile));
        } catch (cacheErr) {
          console.error("Failed to save profile cache:", cacheErr);
        }

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
        try {
          await AsyncStorage.removeItem(`user_profile_${user.id}`);
        } catch (cacheErr) {
          console.warn("Failed to remove profile cache:", cacheErr);
        }
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
      if (session && session.user) {
        try {
          const cachedData = await AsyncStorage.getItem(`user_profile_${session.user.id}`);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setAuthState({
              userId: session.user.id,
              institutionId: null, // Keep null per instructions since network query didn't verify it
              role: parsed.role || null,
              fullName: parsed.fullName || null,
              email: session.user.email || null,
              session,
              isLoading: false,
              theme: parsed.theme || null,
              institutionName: parsed.institutionName || null,
              logoUrl: parsed.logoUrl || null,
              tagline: parsed.tagline || null,
            });
            return;
          }
        } catch (cacheErr) {
          console.error("Failed to read fallback cache on error:", cacheErr);
        }
      }
      setAuthState({
        userId: session ? session.user.id : null,
        institutionId: null,
        role: null,
        fullName: null,
        email: session ? session.user.email || null : null,
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
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // 1. Try to load cached profile optimistically
          try {
            const cachedData = await AsyncStorage.getItem(`user_profile_${session.user.id}`);
            if (cachedData && isMounted) {
              const parsed = JSON.parse(cachedData);
              setAuthState({
                userId: session.user.id,
                institutionId: null, // Keep null per instructions until background refresh verifies it
                role: parsed.role || null,
                fullName: parsed.fullName || null,
                email: session.user.email || null,
                session,
                isLoading: false, // Paint cached UI instantly
                theme: parsed.theme || null,
                institutionName: parsed.institutionName || null,
                logoUrl: parsed.logoUrl || null,
                tagline: parsed.tagline || null,
              });
              setIsLoaded(true);
            }
          } catch (cacheErr) {
            console.error("Failed to load profile cache on launch:", cacheErr);
          }

          // 2. Perform live verification query in the background
          await fetchUserProfile(session);
        } else {
          // No session
          await fetchUserProfile(null);
        }
      } catch (err) {
        console.warn("Initial session recovery failed, signing out:", err);
        await supabase.auth.signOut().catch(() => {});
        await fetchUserProfile(null);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
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
        } else if (event === "SIGNED_IN") {
          await fetchUserProfile(session);
          if (isMounted) {
            setIsLoaded(true);
          }
        } else {
          await fetchUserProfile(session);
        }
      }
    );

    return () => {
      isMounted = false;
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
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out from Supabase:", error);
    } finally {
      try {
        await AsyncStorage.clear();
      } catch (cacheErr) {
        console.error("Failed to clear AsyncStorage on signOut:", cacheErr);
      }
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
      router.replace("/auth/signin");
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, signIn, signOut, isLoaded }}>
      {children}
    </AuthContext.Provider>
  );
}
