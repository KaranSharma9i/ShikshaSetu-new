import React from "react";
import { View, Text, ScrollView } from "react-native";
import Header from "../components/student/Header";
import BottomNavBar from "../components/student/BottomNavBar";

export default function ReportCardScreen() {
  return (
    <View className="flex-1 bg-[#fbf9f8]">
      <Header />
      <ScrollView className="flex-1 px-5 py-4">
        <Text className="font-poppins-bold text-2xl text-[#0D1B2A] mb-4">Report Card</Text>
        <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 items-center justify-center h-64">
          <Text className="font-inter text-gray-500 text-center">Academic results will be displayed here.</Text>
        </View>
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}