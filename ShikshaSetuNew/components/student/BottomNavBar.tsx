import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/homework")) return "homework";
    if (pathname.startsWith("/schedule")) return "schedule";
    if (pathname.startsWith("/profile")) return "profile";
    return "home";
  };

  const activeTab = getActiveTab();

  const handleTabPress = (route: string) => {
    router.replace(route as any);
  };

  const renderTab = (
    tabName: "home" | "homework" | "schedule" | "profile",
    route: string,
    activeIcon: string,
    inactiveIcon: string,
    label: string
  ) => {
    const isActive = activeTab === tabName;

    return (
      <TouchableOpacity
        onPress={() => handleTabPress(route)}
        className="flex-1 items-center justify-center py-1"
        activeOpacity={0.8}
      >
        <View
          className={`flex-row items-center space-x-1.5 px-3 py-1.5 rounded-full ${
            isActive ? "bg-[#ffe088]" : "bg-transparent"
          }`}
        >
          <Ionicons
            name={isActive ? (activeIcon as any) : (inactiveIcon as any)}
            size={18}
            color={isActive ? "#0D1B2A" : "#6B7280"}
          />
          {isActive && (
            <Text className="font-poppins-bold text-[10px] text-[#0D1B2A]">
              {label}
            </Text>
          )}
        </View>
        {!isActive && (
          <Text className="font-poppins text-[9px] text-[#6B7280] mt-0.5">
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="bg-[#0D1B2A] border-t border-gray-800 flex-row justify-around items-center h-20 px-4 pb-2 z-50">
      {renderTab("home", "/", "home", "home-outline", "Home")}
      {renderTab("homework", "/homework", "document-text", "document-text-outline", "Homework")}
      {renderTab("schedule", "/schedule", "calendar", "calendar-outline", "Schedule")}
      {renderTab("profile", "/profile", "person", "person-outline", "Profile")}
    </View>
  );
}
