import React from "react";
import { Stack } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";

export default function StudentsLayout() {
  const { theme } = useAuth();
  const creamColor = theme?.colors?.cream ?? "#F7F3EB";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: creamColor }, // Cream background
      }}
    />
  );
}
