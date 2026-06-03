import React from "react";
import { View, Text, TouchableOpacity, Image, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { schoolData } from "../../constants/schoolData";

interface HeaderProps {
  studentName?: string;
  profilePhotoUrl?: string | null;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ studentName, profilePhotoUrl, title, showBack = false, onBack }: HeaderProps) {
  const router = useRouter();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;
  
  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const nameParts = schoolData.config.name.split(" ");

  return (
    <View 
      className="bg-white border-b border-[#E5E7EB] px-5 flex-row justify-between items-center z-50"
      style={{
        paddingTop: Platform.OS === "android" ? statusBarHeight + 15 : 15,
        paddingBottom: 15,
      }}
    >
      {/* Left side: Logo + School Name or Back Button + Title */}
      {showBack ? (
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            className="p-1 -ml-1"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color="#0D1B2A" />
          </TouchableOpacity>
          {title ? (
            <Text className="font-poppins-bold text-[16px] text-[#0D1B2A] leading-tight">
              {title}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="flex-row items-center space-x-2.5">
          <View className="w-9 h-9 rounded-lg bg-white items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
            <Image
              source={schoolData.config.logo}
              style={{ width: 26, height: 26 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text className="font-poppins-bold text-[13px] text-[#0D1B2A] leading-tight">
              {nameParts[0] || "Gurukul"}
            </Text>
            <Text className="font-poppins-bold text-[13px] text-[#0D1B2A] leading-tight mt-0.5">
              {nameParts[1] || "Shikshalaya"}
            </Text>
          </View>
        </View>
      )}

      {/* Right side: Bell icon + Avatar */}
      <View className="flex-row items-center space-x-4">
        {/* Notification Bell */}
        <TouchableOpacity
          onPress={() => router.push("/circulars" as any)}
          className="p-1 relative"
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#0D1B2A" />
          <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full" />
        </TouchableOpacity>

        {/* Profile Avatar */}
        <TouchableOpacity
          onPress={() => router.push("/profile" as any)}
          activeOpacity={0.7}
        >
          {profilePhotoUrl ? (
            <Image
              source={{ uri: profilePhotoUrl }}
              className="w-8 h-8 rounded-full border border-gray-200"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-[#ffe088] flex-row items-center justify-center border border-[#C9A84C]">
              <Text className="font-poppins-bold text-[10px] text-[#574500]">
                {getInitials(studentName || "Student")}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
