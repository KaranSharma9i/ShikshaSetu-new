import React from "react";
import { View, Text, TouchableOpacity, Image, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { schoolData } from "../../constants/schoolData";
import { useAuth } from "@/src/hooks/useAuth";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export default function Header({ title, showBackButton = true, onBackPress }: HeaderProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <View 
      className="bg-[#0F1C2C] border-b border-gray-800 px-5 flex-row justify-between items-center z-50"
      style={{
        paddingTop: Platform.OS === "android" ? statusBarHeight + 20 : 20,
        paddingBottom: 20,
      }}
    >
      <View className="flex-row items-center space-x-3">
        {showBackButton && (
          <TouchableOpacity
            onPress={() => {
              if (onBackPress) {
                onBackPress();
              } else if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
            className="p-1.5 rounded-full bg-slate-800 mr-2"
          >
            <Ionicons name="arrow-back-outline" size={22} color="#ffe088" />
          </TouchableOpacity>
        )}
        <View className="flex-row items-center space-x-2">
          <View className="w-10 h-10 rounded-lg bg-white items-center justify-center overflow-hidden">
            <Image
              source={schoolData.config.logo}
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text className="text-white font-poppins-bold text-base tracking-wide">
              {schoolData.config.name}
            </Text>
            <Text className="text-[10.5px] font-poppins-semibold text-[#ffe088] tracking-wider uppercase leading-none mt-0.5">
              {title}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center space-x-2">
        <TouchableOpacity
          onPress={() => router.push("/institution/utilities" as any)}
          className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700 overflow-hidden"
        >
          <Ionicons name="apps-outline" size={20} color="#ffe088" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSignOut}
          className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700 overflow-hidden"
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
