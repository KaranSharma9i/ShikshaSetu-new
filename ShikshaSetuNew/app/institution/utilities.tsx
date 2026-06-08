import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { schoolData } from "../../constants/schoolData";
import { useAuth } from "@/src/hooks/useAuth";

export default function UtilitiesHub() {
  const router = useRouter();
  const { signOut, theme } = useAuth();

  const primaryColor = theme?.colors?.primary ?? "#0F1C2C";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#ffe088";
  const creamColor = theme?.colors?.cream ?? "#FDF9F1";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";

  // Time Extension states
  const [selectedClass, setSelectedClass] = useState("Grade 10-B");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [examName, setExamName] = useState("");
  const [extendHours, setExtendHours] = useState("");
  const [reason, setReason] = useState("");
  const [isExtending, setIsExtending] = useState(false);

  const handleTimeExtension = () => {
    if (!examName.trim() || !extendHours.trim()) {
      Alert.alert("Input Required", "Please enter Exam/Assignment Name and extension hours.");
      return;
    }

    setIsExtending(true);
    setTimeout(() => {
      setIsExtending(false);
      Alert.alert(
        "Time Extension Granted",
        `Time limit for "${examName}" in ${selectedClass} has been extended by ${extendHours} hours.\n\nReason: "${reason || "None specified"}"`,
        [{ text: "OK" }]
      );
      setExamName("");
      setExtendHours("");
      setReason("");
    }, 1200);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="More Utilities" />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Profile Card */}
        <View className="px-5 pt-6 mb-6">
          <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm flex-row items-center space-x-4">
            <View className="w-16 h-16 rounded-2xl bg-white border border-gray-100 items-center justify-center overflow-hidden">
              <Image
                source={schoolData.config.logo}
                style={{ width: 52, height: 52 }}
                resizeMode="contain"
              />
            </View>
            <View className="flex-1">
              <Text className="font-poppins-bold text-base leading-tight" style={{ color: primaryColor }}>
                {schoolData.config.name}
              </Text>
              <Text className="text-neutral-steel font-inter text-xs mt-0.5">
                {schoolData.config.tagline}
              </Text>

            </View>
          </View>
        </View>

        {/* Navigation list */}
        <View className="px-5 mb-6">
          <Text className="font-poppins-bold text-sm mb-3 px-1" style={{ color: primaryColor }}>
            Administrative Directory
          </Text>

          <View className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            {/* Student forms link */}
            <TouchableOpacity
              onPress={() => router.push("/institution/register?type=student" as any)}
              className="flex-row items-center justify-between p-4 border-b border-gray-150"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons name="person-add-outline" size={18} color={primaryColor} />
                <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                  Register New Student
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#778598" />
            </TouchableOpacity>

            {/* Teacher forms link */}
            <TouchableOpacity
              onPress={() => router.push("/institution/register?type=teacher" as any)}
              className="flex-row items-center justify-between p-4 border-b border-gray-150"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons name="people-outline" size={18} color={primaryColor} />
                <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                  Appoint New Teacher
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#778598" />
            </TouchableOpacity>

            {/* Calendar Events link */}
            <TouchableOpacity
              onPress={() => router.push("/institution/events" as any)}
              className="flex-row items-center justify-between p-4 border-b border-gray-150"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons name="calendar-outline" size={18} color={primaryColor} />
                <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                  Academic Calendar & Events Hub
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#778598" />
            </TouchableOpacity>

            {/* Fee management link */}
            <TouchableOpacity
              onPress={() => router.push("/institution/fees" as any)}
              className="flex-row items-center justify-between p-4 border-b border-gray-150"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons name="cash-outline" size={18} color={primaryColor} />
                <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                  Fee Collection Dashboard
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#778598" />
            </TouchableOpacity>

            {/* Update Password */}
            <TouchableOpacity
              onPress={() => router.push("/institution/update-password" as any)}
              className="flex-row items-center justify-between p-4 border-b border-gray-150"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons name="key-outline" size={18} color={primaryColor} />
                <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                  Update Password
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#778598" />
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              onPress={async () => {
                try {
                  await signOut();
                } catch (err) {
                  console.error("Logout error:", err);
                  Alert.alert("Logout Failed", "Something went wrong while signing out.");
                }
              }}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons name="log-out-outline" size={18} color={dangerColor} />
                <Text className="font-poppins-semibold text-xs" style={{ color: dangerColor }}>
                  Sign Out / Log Out
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={dangerColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Limit Extension Tool (Interactive Form) */}
        <View className="px-5">
          <View className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <View className="flex-row justify-between items-center mb-4 border-b border-gray-50 pb-2">
              <View>
                <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }}>
                  Time Limit Extension
                </Text>
                <Text className="text-[10px] text-neutral-steel">
                  Extend exam or homework limits for sections
                </Text>
              </View>
              <Ionicons name="hourglass-outline" size={20} color={secondaryColor} />
            </View>

            {/* Class Dropdown selector */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Select Class Section
            </Text>
            <View className="relative z-50 mb-4" style={{ zIndex: 50 }}>
              <TouchableOpacity
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex-row items-center justify-between bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl"
              >
                <Text className="text-xs font-inter" style={{ color: primaryColor }}>
                  {selectedClass}
                </Text>
                <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={14} color={primaryColor} />
              </TouchableOpacity>

              {isDropdownOpen && (
                <View className="absolute left-0 right-0 top-[52px] bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                  {["Grade 9-A", "Grade 10-B", "Grade 11-A"].map((cls) => (
                    <TouchableOpacity
                      key={cls}
                      onPress={() => {
                        setSelectedClass(cls);
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-2.5"
                      style={selectedClass === cls ? { backgroundColor: creamColor } : undefined}
                    >
                      <Text
                        className={`text-xs ${
                          selectedClass === cls ? "font-poppins-bold" : "font-poppins-medium"
                        }`}
                        style={{ color: selectedClass === cls ? secondaryColor : primaryColor }}
                      >
                        {cls}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Exam / Homework name input */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Exam or Homework Title
            </Text>
            <TextInput
              value={examName}
              onChangeText={setExamName}
              placeholder="e.g. Calculus Mid-Term Examination"
              placeholderTextColor="#9CA3AF"
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs"
              style={{ color: primaryColor }}
            />

            {/* Hours Extension input */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Extend Time Limit By (Hours)
            </Text>
            <TextInput
              value={extendHours}
              onChangeText={setExtendHours}
              placeholder="e.g. 2, 4, 24"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs"
              style={{ color: primaryColor }}
            />

            {/* Reason input */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Reason for Extension
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Power outage during exam session"
              placeholderTextColor="#9CA3AF"
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-6 font-inter text-xs"
              style={{ color: primaryColor }}
            />

            {/* Button */}
            <TouchableOpacity
              onPress={handleTimeExtension}
              disabled={isExtending}
              className="py-4 rounded-xl items-center flex-row justify-center space-x-2"
              style={{ backgroundColor: primaryColor }}
            >
              {isExtending ? (
                <Text className="text-white font-poppins-bold text-xs">Granting Time...</Text>
              ) : (
                <>
                  <Ionicons name="time-outline" size={16} color={secondaryLightColor} />
                  <Text className="font-poppins-bold text-xs" style={{ color: secondaryLightColor }}>
                    Extend Limit Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="utilities" />
    </SafeAreaView>
  );
}
