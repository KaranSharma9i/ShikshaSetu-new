import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";

interface BottomNavBarProps {
  activeTab: "home" | "academics" | "circulars" | "utilities";
}

export default function BottomNavBar({ activeTab }: BottomNavBarProps) {
  const router = useRouter();
  const { theme } = useAuth();

  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#F2C14E";
  const steelGrayColor = theme?.colors?.steelGray ?? "#6B7280";

  const handleTabPress = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View 
      className="border-t border-gray-800 flex-row justify-around items-center h-20 px-4 pb-2 z-50"
      style={{ backgroundColor: primaryColor }}
    >
      {/* Home Tab */}
      <TouchableOpacity
        onPress={() => handleTabPress("/institution")}
        className="flex-1 items-center justify-center py-2"
      >
        <Ionicons
          name={activeTab === "home" ? "home" : "home-outline"}
          size={20}
          color={activeTab === "home" ? secondaryLightColor : steelGrayColor}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "home" ? "font-bold" : ""
          }`}
          style={{ color: activeTab === "home" ? secondaryLightColor : steelGrayColor }}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Academics Tab */}
      <TouchableOpacity
        onPress={() => handleTabPress("/institution/academics")}
        className="flex-1 items-center justify-center py-2"
      >
        <Ionicons
          name={activeTab === "academics" ? "school" : "school-outline"}
          size={20}
          color={activeTab === "academics" ? secondaryLightColor : steelGrayColor}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "academics" ? "font-bold" : ""
          }`}
          style={{ color: activeTab === "academics" ? secondaryLightColor : steelGrayColor }}
        >
          Academics
        </Text>
      </TouchableOpacity>

      {/* Circulars/Notices Tab */}
      <TouchableOpacity
        onPress={() => handleTabPress("/institution/circulars")}
        className="flex-1 items-center justify-center py-2"
      >
        <Ionicons
          name={activeTab === "circulars" ? "notifications" : "notifications-outline"}
          size={20}
          color={activeTab === "circulars" ? secondaryLightColor : steelGrayColor}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "circulars" ? "font-bold" : ""
          }`}
          style={{ color: activeTab === "circulars" ? secondaryLightColor : steelGrayColor }}
        >
          Notices
        </Text>
      </TouchableOpacity>

      {/* Utilities Tab */}
      <TouchableOpacity
        onPress={() => handleTabPress("/institution/utilities")}
        className="flex-1 items-center justify-center py-2"
      >
        <Ionicons
          name={activeTab === "utilities" ? "grid" : "grid-outline"}
          size={20}
          color={activeTab === "utilities" ? secondaryLightColor : steelGrayColor}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "utilities" ? "font-bold" : ""
          }`}
          style={{ color: activeTab === "utilities" ? secondaryLightColor : steelGrayColor }}
        >
          Utilities
        </Text>
      </TouchableOpacity>
    </View>
  );
}
