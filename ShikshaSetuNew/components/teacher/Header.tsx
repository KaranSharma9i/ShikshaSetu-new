import React from "react";
import { View, Text, TouchableOpacity, Platform, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ title, showBack = false, onBack }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-white border-b border-[#E4E2E1] px-4 flex-row items-center justify-between z-50"
      style={{
        paddingTop: Platform.OS === "ios" ? insets.top : (StatusBar.currentHeight || 0) + 12,
        paddingBottom: 12,
      }}
    >
      {/* Left Action Button */}
      <View className="w-10 items-start">
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            className="p-1"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color="#0D1B2A" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            className="p-1"
            accessibilityLabel="Menu"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={24} color="#0D1B2A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Centered Title */}
      <View className="flex-1 items-center">
        <Text
          className="font-poppins-semibold text-[18px] text-[#0D1B2A]"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right Notification Button */}
      <View className="w-10 items-end">
        <TouchableOpacity
          activeOpacity={0.7}
          className="p-1 relative"
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color="#0D1B2A" />
          {/* Red Notification Badge */}
          <View
            className="absolute top-1.5 right-1.5 bg-[#DC2626] rounded-full"
            style={{ width: 8, height: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
