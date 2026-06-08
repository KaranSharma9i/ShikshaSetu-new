import React from "react";
import { View, Text, TouchableOpacity, Platform, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/hooks/useAuth";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ title, showBack = false, onBack }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const lightGrayColor = theme?.colors?.lightGray ?? "#E4E2E1";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";

  return (
    <View
      className="bg-white border-b px-4 flex-row items-center justify-between z-50"
      style={{
        paddingTop: Platform.OS === "ios" ? insets.top : (StatusBar.currentHeight || 0) + 12,
        paddingBottom: 12,
        borderBottomColor: lightGrayColor,
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
            <Ionicons name="chevron-back" size={24} color={primaryColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            className="p-1"
            accessibilityLabel="Menu"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={24} color={primaryColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Centered Title */}
      <View className="flex-1 items-center">
        <Text
          className="font-poppins-semibold text-[18px]"
          style={{ color: primaryColor }}
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
          <Ionicons name="notifications-outline" size={22} color={primaryColor} />
          {/* Red Notification Badge */}
          <View
            className="absolute top-1.5 right-1.5 rounded-full"
            style={{ width: 8, height: 8, backgroundColor: dangerColor }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
