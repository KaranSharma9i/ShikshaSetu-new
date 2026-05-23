import { useAuth } from '@/utils/mockAuth';
import { Redirect, Stack } from 'expo-router';

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
