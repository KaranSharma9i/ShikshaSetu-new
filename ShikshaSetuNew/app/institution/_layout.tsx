import { useAuth } from "@/src/hooks/useAuth";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, SafeAreaView } from "react-native";

export default function InstitutionLayout() {
  const { isSignedIn, isLoaded, role } = useAuth();

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDF9F1] justify-center items-center">
        <ActivityIndicator size="large" color="#FF5E00" />
      </SafeAreaView>
    );
  }

  if (!isSignedIn || role !== "institution_admin") {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="academics" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="circulars" />
      <Stack.Screen name="events" />
      <Stack.Screen name="fees" />
      <Stack.Screen name="register" />
      <Stack.Screen name="utilities" />
      <Stack.Screen name="update-password" />
    </Stack>
  );
}

