import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { schoolData } from "../../constants/schoolData";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton = true }: HeaderProps) {
  const router = useRouter();

  return (
    <View className="bg-[#0F1C2C] border-b border-gray-800 px-5 py-4 flex-row justify-between items-center z-50">
      <View className="flex-row items-center space-x-3">
        {showBackButton && (
          <TouchableOpacity
            onPress={() => router.replace("/")}
            className="p-1 rounded-full bg-slate-800 mr-2"
          >
            <Ionicons name="arrow-back-outline" size={20} color="#ffe088" />
          </TouchableOpacity>
        )}
        <View className="flex-row items-center space-x-2">
          <View className="w-8 h-8 rounded-lg bg-white items-center justify-center overflow-hidden">
            <Image
              source={schoolData.config.logo}
              style={{ width: 26, height: 26 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text className="text-white font-poppins-bold text-sm tracking-wide">
              {schoolData.config.name}
            </Text>
            <Text className="text-[9px] font-poppins-semibold text-[#ffe088] tracking-wider uppercase leading-none mt-0.5">
              {title}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/institution/utilities" as any)}
        className="w-9 h-9 rounded-full bg-slate-800 items-center justify-center border border-slate-700 overflow-hidden"
      >
        <Ionicons name="apps-outline" size={18} color="#ffe088" />
      </TouchableOpacity>
    </View>
  );
}
