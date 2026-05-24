import { useAuth } from "@/src/hooks/useAuth";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
