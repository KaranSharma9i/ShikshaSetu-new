import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
} from "@expo-google-fonts/inter";
import {
  OpenSans_400Regular,
} from "@expo-google-fonts/open-sans";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, Text } from "react-native";
import { MockAuthProvider } from "../utils/mockAuth";

// Prevent the splash screen from auto-hiding before asset loading is complete.
try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.warn("SplashScreen.preventAutoHideAsync() failed:", e);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Poppins-Regular": Poppins_400Regular,
    "Poppins-Medium": Poppins_500Medium,
    "Poppins-SemiBold": Poppins_600SemiBold,
    "Poppins-Bold": Poppins_700Bold,
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "OpenSans-Regular": OpenSans_400Regular,
  });

  useEffect(() => {
    if (loaded || error) {
      try {
        SplashScreen.hideAsync();
      } catch (e) {
        console.warn("SplashScreen.hideAsync() failed:", e);
      }
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <MockAuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MockAuthProvider>
  );
}
