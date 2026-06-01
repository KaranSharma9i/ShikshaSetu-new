import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Header from "@/components/teacher/Header";

export default function HomeworkPublished() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Retrieve parameters from local search params
  const {
    subject = "Subject",
    grade = "Grade X",
    chapter = "Topic",
    questionCount = "0",
    studentCount = "42",
    dueDate = "07 Jun 2026",
  } = params;

  // Format grade title: e.g. "Class 10" -> "Grade 10"
  const formatGradeName = (name: string | string[]) => {
    const singleName = Array.isArray(name) ? name[0] : name;
    if (!singleName) return "";
    return singleName.includes("Class") ? singleName.replace("Class", "Grade") : singleName;
  };

  const cleanGrade = formatGradeName(grade);
  const cleanSubject = Array.isArray(subject) ? subject[0] : subject;

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      {/* Header: title "Gurukul Admin", no back button */}
      <Header title="Gurukul Admin" showBack={false} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Success Icon */}
        <View
          style={{ width: 96, height: 96, borderRadius: 48 }}
          className="bg-[#FFF8E1] items-center justify-center mb-6"
        >
          <Feather name="check" size={40} color="#0D1B2A" />
        </View>

        {/* 2. Title */}
        <Text className="font-poppins-bold text-[28px] text-[#0D1B2A] text-center leading-tight mb-2">
          Assignment Published
        </Text>

        {/* 3. Subtitle */}
        <Text
          style={{ maxWidth: 280 }}
          className="font-inter text-sm text-[#44474C] text-center leading-relaxed mb-8"
        >
          The curriculum has been successfully delivered to your students' portals.
        </Text>

        {/* 4. Assignment Card */}
        <View
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
          className="w-full bg-white rounded-2xl border-2 border-[#D4AF37] p-5 mb-5"
        >
          {/* Top Row */}
          <View className="flex-row items-center mb-3">
            <Feather name="award" size={16} color="#D4AF37" className="mr-2" />
            <Text
              style={{ letterSpacing: 0.5 }}
              className="font-open-sans font-bold text-[11px] text-[#D4AF37] uppercase"
            >
              ACADEMIC EXCELLENCE
            </Text>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-[#E4E2E1] w-full mb-3" />

          {/* Heading info */}
          <Text className="font-poppins-bold text-[20px] text-[#0D1B2A] mb-1.5 leading-snug">
            {cleanGrade} — {cleanSubject}
          </Text>
          
          <Text className="font-inter text-gray-500 text-sm mb-4" numberOfLines={1}>
            {chapter}
          </Text>

          {/* Icon metrics row */}
          <View className="flex-row items-center space-x-6">
            <View className="flex-row items-center">
              <Feather name="file-text" size={16} color="#44474C" />
              <Text className="font-inter-medium text-sm text-[#44474C] ml-2">
                {questionCount} Questions
              </Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="users" size={16} color="#44474C" />
              <Text className="font-inter-medium text-sm text-[#44474C] ml-2">
                {studentCount} Students
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Due Date Card */}
        <View className="w-full bg-[#0D1B2A] rounded-2xl p-6 items-center mb-8">
          <Feather name="calendar" size={24} color="#D4AF37" className="mb-2" />
          
          <Text
            style={{ letterSpacing: 0.5 }}
            className="font-open-sans font-bold text-[11px] text-[#D4AF37] uppercase mb-1"
          >
            DUE DATE
          </Text>
          
          <Text className="font-poppins-bold text-[22px] text-[#D4AF37] mb-4">
            {dueDate}
          </Text>

          {/* Delivery pill */}
          <View className="bg-[#1A2A3A] px-4 py-1.5 rounded-full border border-opacity-10 border-[#D4AF37]">
            <Text className="font-open-sans font-bold text-[12px] text-[#D4AF37]">
              Delivery: 100% Complete
            </Text>
          </View>
        </View>

        {/* 6. Two Action Buttons */}
        <View className="w-full space-y-3">
          {/* Primary View Sent Assignment */}
          <TouchableOpacity
            onPress={() => router.push("/(teacher)/teacher-homework" as any)}
            activeOpacity={0.85}
            className="w-full h-[52px] bg-[#0D1B2A] rounded-2xl flex-row items-center justify-center"
          >
            <Feather name="eye" size={18} color="white" className="mr-2" />
            <Text className="font-poppins-semibold text-[15px] text-white">
              View Sent Assignment
            </Text>
          </TouchableOpacity>

          {/* Secondary Return to Dashboard */}
          <TouchableOpacity
            onPress={() => router.replace("/(teacher)/" as any)}
            activeOpacity={0.85}
            className="w-full h-[52px] bg-white border border-[#0D1B2A] rounded-2xl flex-row items-center justify-center"
          >
            <Feather name="grid" size={18} color="#0D1B2A" className="mr-2" />
            <Text className="font-poppins-semibold text-[15px] text-[#0D1B2A]">
              Return to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
