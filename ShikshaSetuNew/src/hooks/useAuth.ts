import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const user = context.userId
    ? {
        id: context.userId,
        email: context.email,
        fullName: context.fullName,
        role: context.role,
        primaryEmailAddress: context.email
          ? {
              emailAddress: context.email,
            }
          : null,
      }
    : null;

  return {
    userId: context.userId,
    institutionId: context.institutionId,
    role: context.role,
    fullName: context.fullName,
    email: context.email,
    session: context.session,
    isLoading: context.isLoading,
    signIn: context.signIn,
    signOut: context.signOut,
    user,
    // Clerk compatibility flags
    isSignedIn: !!context.userId,
    isLoaded: !context.isLoading,
  };
}
