import { useAuth } from "@/src/hooks/useAuth";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, SafeAreaView } from "react-native";

export default function InstitutionLayout() {
  const { isSignedIn, isLoaded, role, theme } = useAuth();
  const creamColor = theme?.colors?.cream ?? "#FDF9F1";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";

  if (!isLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: creamColor, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={secondaryColor} />
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

