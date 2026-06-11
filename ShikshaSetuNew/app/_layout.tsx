import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider } from "@/src/providers/AuthProvider";
import { useAuth } from "@/src/hooks/useAuth";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  OpenSans_400Regular,
  OpenSans_700Bold,
} from "@expo-google-fonts/open-sans";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  "You are setting the style `{ shadowOffset: ... }` as a prop",
  "You are setting the style { shadowOffset: ... } as a prop",
]);

SplashScreen.preventAutoHideAsync();

function RootNavigationGuard() {
  const { session, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthFlow = segments[0] === "auth" || segments[0] === "onboarding";

    if (!session && !inAuthFlow) {
      router.replace("/auth/signin");
    }
  }, [session, isLoaded, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Alias names (used in some components)
    "Poppins-Regular": Poppins_400Regular,
    "Poppins-Medium": Poppins_500Medium,
    "Poppins-SemiBold": Poppins_600SemiBold,
    "Poppins-Bold": Poppins_700Bold,
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "OpenSans-Regular": OpenSans_400Regular,
    "OpenSans-Bold": OpenSans_700Bold,
    "OpenSans": OpenSans_400Regular,
    // Standard expo-google-fonts names (used in other components)
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    OpenSans_400Regular,
    OpenSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootNavigationGuard />
    </AuthProvider>
  );
}
