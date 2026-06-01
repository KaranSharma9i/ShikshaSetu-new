import React from "react";
import { Stack } from "expo-router";

export default function StudentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F7F3EB" }, // Cream background
      }}
    />
  );
}
