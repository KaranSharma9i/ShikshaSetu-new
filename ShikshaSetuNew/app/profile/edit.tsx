import React from "react";
import { View, Text, TouchableOpacity, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EditProfileScreen() {
  const router = useRouter();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  return (
    <View className="flex-1 bg-[#fbf9f8]">
      {/* Header with back button */}
      <View 
        className="bg-white border-b border-[#E5E7EB] px-5 flex-row items-center z-50"
        style={{
          paddingTop: Platform.OS === "android" ? statusBarHeight + 15 : 45,
          paddingBottom: 15,
        }}
      >
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="mr-3 p-1"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text className="font-poppins-bold text-lg text-[#0D1B2A]">
          Update Personal Information
        </Text>
      </View>

      {/* Centered placeholder text */}
      <View className="flex-1 items-center justify-center p-6">
        <Text className="font-poppins-medium text-[#0D1B2A] text-lg text-center">
          Edit Profile - Coming in next batch
        </Text>
      </View>
    </View>
  );
}
