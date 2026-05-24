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

  return <Stack screenOptions={{ headerShown: false }} />;
}

