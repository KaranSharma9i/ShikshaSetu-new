import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface BottomNavBarProps {
  activeTab: "home" | "academics" | "circulars" | "utilities";
}

export default function BottomNavBar({ activeTab }: BottomNavBarProps) {
  const router = useRouter();

  const handleTabPress = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View className="bg-[#0F1C2C] border-t border-gray-800 flex-row justify-around items-center h-20 px-4 pb-2 z-50">
      {/* Home Tab */}
      <TouchableOpacity
        onPress={() => handleTabPress("/institution")}
        className="flex-1 items-center justify-center py-2"
      >
        <Ionicons
          name={activeTab === "home" ? "home" : "home-outline"}
          size={20}
          color={activeTab === "home" ? "#ffe088" : "#778598"}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "home" ? "text-[#ffe088] font-bold" : "text-[#778598]"
          }`}
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
          color={activeTab === "academics" ? "#ffe088" : "#778598"}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "academics" ? "text-[#ffe088] font-bold" : "text-[#778598]"
          }`}
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
          color={activeTab === "circulars" ? "#ffe088" : "#778598"}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "circulars" ? "text-[#ffe088] font-bold" : "text-[#778598]"
          }`}
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
          color={activeTab === "utilities" ? "#ffe088" : "#778598"}
        />
        <Text
          className={`font-poppins text-[10px] mt-1 ${
            activeTab === "utilities" ? "text-[#ffe088] font-bold" : "text-[#778598]"
          }`}
        >
          Utilities
        </Text>
      </TouchableOpacity>
    </View>
  );
}
