import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SignupScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();

  // Helper to get Role emoji and styling
  const getRoleBadgeInfo = () => {
    switch (role?.toLowerCase()) {
      case "student":
        return { label: "Student Account 🎓", color: "bg-[#FFF4E5] text-[#FF8300] border-[#FFE0CC]" };
      case "teacher":
        return { label: "Teacher Account 👩‍🏫", color: "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]" };
      case "school":
      case "institution_admin":
        return { label: "School Portal 🏫", color: "bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]" };
      default:
        return { label: "Personal Account ✨", color: "bg-[#FFF4E5] text-[#FF8300] border-[#FFE0CC]" };
    }
  };

  const badgeInfo = getRoleBadgeInfo();

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Back Button */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/80 items-center justify-center border border-gray-100 shadow-sm"
            >
              <Ionicons name="arrow-back" size={20} color="#1F2937" />
            </TouchableOpacity>
            
            {/* Dynamic Role Badge */}
            <View className={`px-4 py-1.5 rounded-full border ${badgeInfo.color}`}>
              <Text className="font-poppins-bold text-xs">{badgeInfo.label}</Text>
            </View>
            <View className="w-10" />
          </View>

          {/* Logo & App Branding */}
          <View className="items-center justify-center mt-2 mb-2">
            <View className="w-24 h-24 bg-white rounded-2xl items-center justify-center shadow-sm border border-orange-100/30 mb-2">
              <Image
                source={require("../../assets/icon.png")}
                style={{ width: 72, height: 72 }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-poppins-bold text-margam-orange">
              Mar<Text className="text-margam-yellow">gam</Text>
            </Text>
          </View>
          <Text className="text-center font-poppins text-[10px] uppercase tracking-widest text-margam-orange font-bold mb-4">
            Learn • Connect • Grow
          </Text>

          {/* Title */}
          <View className="items-center px-6">
            <Text className="text-3xl font-poppins-bold text-neutral-charcoal text-center mb-1">
              Create your account
            </Text>
            <Text className="text-sm font-inter text-neutral-steel text-center mb-3">
              Start your learning journey today ✨
            </Text>
          </View>

          {/* Mascot Section */}
          <View className="items-center justify-center mt-2 relative">
            <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFF4E5', position: 'absolute', opacity: 0.7 }} />
            <Image
              source={require("../../assets/mascot.png")}
              style={{ width: 190, height: 190, maxWidth: '80%' }}
              resizeMode="contain"
            />
          </View>

          {/* Main Card */}
          <View className="bg-white rounded-3xl mx-4 my-4 p-6 shadow-md border border-orange-100/50 justify-center items-center">
            <Ionicons name="information-circle-outline" size={48} color="#FF5E00" style={{ marginBottom: 12 }} />
            <Text className="text-center font-poppins-medium text-neutral-charcoal text-base leading-relaxed">
              Account creation is managed by your institution administrator. Please contact them to get access.
            </Text>
          </View>

          {/* Bottom redirection */}
          <View className="flex-row justify-center items-center mt-2 mb-8">
            <Text className="font-inter text-neutral-steel text-sm">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/auth/signin" as any)}>
              <Text className="font-poppins-bold text-[#FF5E00] text-sm">
                Log in
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
