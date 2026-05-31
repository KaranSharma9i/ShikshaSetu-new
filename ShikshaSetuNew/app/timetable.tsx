import React from "react";
import { View, Text } from "react-native";
import Header from "../components/student/Header";
import BottomNavBar from "../components/student/BottomNavBar";

export default function TimetableScreen() {
  return (
    <View className="flex-1 bg-[#fbf9f8]">
      <Header />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="font-poppins-medium text-[#0D1B2A] text-lg text-center">
          Class Schedule - Coming in next batch
        </Text>
      </View>
      <BottomNavBar />
    </View>
  );
}
