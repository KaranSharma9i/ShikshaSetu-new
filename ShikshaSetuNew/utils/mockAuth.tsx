import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

interface User {
  emailAddress: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  signIn: (email: string) => Promise<void>;
  signUp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await SecureStore.getItemAsync("mock_session");
        if (session) {
          setIsSignedIn(true);
          setUser({
            emailAddress: session,
            firstName: session.split("@")[0],
          });
        }
      } catch (e) {
        console.error("Failed to load session", e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadSession();
  }, []);

  const signIn = async (email: string) => {
    await SecureStore.setItemAsync("mock_session", email);
    setIsSignedIn(true);
    setUser({
      emailAddress: email,
      firstName: email.split("@")[0],
    });
  };

  const signUp = async (email: string) => {
    await SecureStore.setItemAsync("mock_session", email);
    setIsSignedIn(true);
    setUser({
      emailAddress: email,
      firstName: email.split("@")[0],
    });
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync("mock_session");
    setIsSignedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoaded, isSignedIn, user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within MockAuthProvider");
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    userId: context.isSignedIn ? "mock-user-id" : null,
    signOut: context.signOut,
  };
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useUser must be used within MockAuthProvider");
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user ? {
      emailAddresses: [{ emailAddress: context.user.emailAddress }],
      primaryEmailAddress: { emailAddress: context.user.emailAddress },
      firstName: context.user.firstName || "User",
      lastName: "",
    } : null,
  };
}

export function useClerk() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useClerk must be used within MockAuthProvider");
  return {
    signOut: context.signOut,
  };
}

export function useSignIn() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useSignIn must be used within MockAuthProvider");

  const signInMethod = {
    create: async (params: { identifier: string; password?: string }) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        status: "complete",
        createdSessionId: "mock-session-id-" + params.identifier,
        identifier: params.identifier,
      };
    },
  };

  const setActive = async (params: { session: string }) => {
    const email = params.session.replace("mock-session-id-", "");
    await context.signIn(email);
  };

  return {
    isLoaded: context.isLoaded,
    signIn: signInMethod,
    setActive,
  };
}

export function useSignUp() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useSignUp must be used within MockAuthProvider");

  const [tempEmail, setTempEmail] = useState<string>("");

  const signUpMethod = {
    create: async (params: { emailAddress: string; password?: string }) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      setTempEmail(params.emailAddress);
    },
    prepareEmailAddressVerification: async (params: { strategy: string }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    attemptEmailAddressVerification: async (params: { code: string }) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        status: "complete",
        createdSessionId: "mock-session-id-" + (tempEmail || "newuser@example.com"),
      };
    },
  };

  const setActive = async (params: { session: string }) => {
    const email = params.session.replace("mock-session-id-", "");
    await context.signUp(email);
  };

  return {
    isLoaded: context.isLoaded,
    signUp: signUpMethod,
    setActive,
  };
}
