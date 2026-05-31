import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import BottomNavBar from "@/components/teacher/BottomNavBar";

export default function TeacherLayout() {
  const { isSignedIn, isLoaded, role, session } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Reset redirect flag on logout so re-login can redirect again
  useEffect(() => {
    if (!session) hasRedirected.current = false;
  }, [session]);

  useEffect(() => {
    // Only run once when loading is done
    if (!isLoaded) return;
    if (hasRedirected.current) return;

    if (!isSignedIn) {
      hasRedirected.current = true;
      router.replace("/auth/signin");
      return;
    }

    if (role !== "teacher") {
      hasRedirected.current = true;
      router.replace("/auth/signin");
      return;
    }

    // Teacher is authenticated — do nothing,
    // let Expo Router render the screen
  }, [isLoaded, isSignedIn, role]);

  // Show loading spinner while checking auth
  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F7F3EB",
        }}
      >
        <ActivityIndicator color="#D4AF37" size="large" />
      </View>
    );
  }

  // Don't render children until auth confirmed
  if (!isSignedIn || role !== "teacher") return null;

  // Render the teacher portal
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <BottomNavBar />
    </View>
  );
}
