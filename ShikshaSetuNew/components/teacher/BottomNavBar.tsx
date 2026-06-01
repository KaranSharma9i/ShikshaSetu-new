import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Hide BottomNavBar on the homework published screen
  if (pathname.includes("/homework/published") || pathname.includes("/published")) {
    return null;
  }

  const tabs = [
    {
      name: "Home",
      route: "/(teacher)/",
      icon: "home" as const,
    },
    {
      name: "Homework",
      route: "/(teacher)/teacher-homework",
      icon: "file-text" as const,
    },
    {
      name: "Students",
      route: "/(teacher)/teacher-students",
      icon: "users" as const,
    },
    {
      name: "More",
      route: "/(teacher)/more",
      icon: "grid" as const,
    },
  ];

  // Helper to determine if the tab is active
  const isTabActive = (route: string) => {
    // Normalise route and pathname (removing route group parentheses if present)
    const normalizedPath = pathname.replace(/\/\(teacher\)/, "");
    const normalizedRoute = route.replace(/\/\(teacher\)/, "");

    if (normalizedRoute === "/" || normalizedRoute === "") {
      return normalizedPath === "/" || normalizedPath === "" || normalizedPath === "/(teacher)" || normalizedPath === "/(teacher)/";
    }

    return normalizedPath === normalizedRoute || normalizedPath.startsWith(normalizedRoute + "/");
  };

  const handlePress = (route: string) => {
    router.navigate(route as any);
  };

  return (
    <View
      style={{
        backgroundColor: "#0D1B2A", // Navy
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.08)",
      }}
      className="flex-row justify-around items-center w-full px-2"
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => handlePress(tab.route)}
            activeOpacity={0.8}
            className="flex-1 items-center justify-center py-2 h-full relative"
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Feather
              name={tab.icon}
              size={20}
              color={active ? "#D4AF37" : "rgba(255, 255, 255, 0.6)"}
            />
            <Text
              style={{
                color: active ? "#D4AF37" : "rgba(255, 255, 255, 0.6)",
                fontSize: 11,
                marginTop: 4,
              }}
              className={active ? "font-poppins-semibold" : "font-poppins"}
            >
              {tab.name}
            </Text>

            {/* Underline Indicator */}
            {active && (
              <View
                className="absolute bottom-1 bg-[#D4AF37]"
                style={{
                  width: 24,
                  height: 2,
                  borderRadius: 9999,
                }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
