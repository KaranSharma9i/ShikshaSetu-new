import React from "react";
import { Stack } from "expo-router";

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="circulars" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="exams" />
      <Stack.Screen name="marks" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="update-password" />
    </Stack>
  );
}
