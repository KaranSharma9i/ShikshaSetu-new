import React from "react";
import { View, Text } from "react-native";
import Header from "@/components/teacher/Header";

export default function StudentsStub() {
  return (
    <View className="flex-1 bg-[#F7F3EB]">
      <Header title="Students" showBack={false} />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="font-poppins-bold text-2xl text-[#0D1B2A] text-center">
          Students Directory
        </Text>
        <Text className="font-inter text-gray-500 text-center mt-2">
          This feature is coming soon. Stay tuned!
        </Text>
      </View>
    </View>
  );
}
