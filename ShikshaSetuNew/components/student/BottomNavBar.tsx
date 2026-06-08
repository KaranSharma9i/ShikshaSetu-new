import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/useAuth";

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useAuth();

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
          className="flex-row items-center space-x-1.5 px-3 py-1.5 rounded-full"
          style={isActive ? { backgroundColor: theme?.colors?.secondaryLight ?? "#ffe088" } : undefined}
        >
          <Ionicons
            name={isActive ? (activeIcon as any) : (inactiveIcon as any)}
            size={18}
            color={isActive ? (theme?.colors?.primary ?? "#0D1B2A") : (theme?.colors?.steelGray ?? "#6B7280")}
          />
          {isActive && (
            <Text 
              className="font-poppins-bold text-[10px]"
              style={{ color: theme?.colors?.primary ?? "#0D1B2A" }}
            >
              {label}
            </Text>
          )}
        </View>
        {!isActive && (
          <Text 
            className="font-poppins text-[9px] mt-0.5"
            style={{ color: theme?.colors?.steelGray ?? "#6B7280" }}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View 
      className="border-t border-gray-800 flex-row justify-around items-center h-20 px-4 pb-2 z-50"
      style={{ backgroundColor: theme?.colors?.primary ?? "#0D1B2A" }}
    >
      {renderTab("home", "/", "home", "home-outline", "Home")}
      {renderTab("homework", "/homework", "document-text", "document-text-outline", "Homework")}
      {renderTab("schedule", "/schedule", "calendar", "calendar-outline", "Schedule")}
      {renderTab("profile", "/profile", "person", "person-outline", "Profile")}
    </View>
  );
}
