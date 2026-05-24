import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";

// Dummy Seed Database
const dummySeedData = {
  student: {
    name: "Karan Sharma",
    class: "Grade 10-A",
    rollNumber: "24",
    performance: [
      { subject: "Mathematics", marks: 92, score: 9.5, teacher: "Ananya Rao" },
      { subject: "Science", marks: 88, score: 9.0, teacher: "Rajesh Kumar" },
      { subject: "English", marks: 95, score: 9.8, teacher: "Sarah Jones" },
      { subject: "History", marks: 85, score: 8.5, teacher: "Amit Sharma" },
    ],
    homework: [
      { id: "1", subject: "Mathematics", topic: "Quadratic Equations", score: "9/10 (AI Evaluated)", date: "May 18, 2026" },
      { id: "2", subject: "Physics", topic: "Refraction of Light", score: "8/10 (AI Evaluated)", date: "May 19, 2026" },
    ],
    circulars: [
      "Annual day preparations starting next week.",
      "Summer holidays schedule updated.",
      "Science fair registration open.",
    ],
    feeReminder: "Term 2 fees due: ₹12,500 (Due by 30th May)",
  },
  teacher: {
    name: "Dr. Ananya Rao",
    subject: "Mathematics & Physics",
    classes: ["Grade 10-A", "Grade 10-B", "Grade 9-A"],
    performanceIndex: "98%",
    recentHomeworkCreated: [
      { id: "1", subject: "Mathematics", chapter: "Trigonometric Identites", difficulty: "Medium", date: "May 20, 2026" },
      { id: "2", subject: "Physics", chapter: "Electromagnetism", difficulty: "Hard", date: "May 17, 2026" }
    ]
  }
};

export default function Index() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user, signOut } = useAuth();

  // Selected Portal tab state
  const [activePortalState, setActivePortalState] = useState<"student" | "teacher">("student");
  const activePortal = activePortalState;

  // Redirect to onboarding if signed out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/onboarding");
    }
  }, [isLoaded, isSignedIn]);

  // Sync active portal with user role
  useEffect(() => {
    console.log("DEBUG - Auth State:", {
      isSignedIn,
      isLoaded,
      userId: user?.id,
      email: user?.email,
      role: user?.role
    });
    if (isLoaded && isSignedIn && user?.role) {
      if (user.role === "institution_admin") {
        router.replace("/institution");
      } else if (user.role === "teacher") {
        setActivePortalState("teacher");
      } else if (user.role === "student") {
        setActivePortalState("student");
      }
    }
  }, [isLoaded, isSignedIn, user?.role]);

  if (!isLoaded || !isSignedIn || user?.role === "institution_admin") {
    return (
      <SafeAreaView className="flex-1 bg-[#FDF9F1] justify-center items-center">
        <ActivityIndicator size="large" color="#FF5E00" />
      </SafeAreaView>
    );
  }

  const handleSignOut = () => {
    signOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      {/* Top Header */}
      <View className="bg-white border-b border-orange-100/30 px-6 py-4 flex-row justify-between items-center shadow-sm">
        <View className="flex-row items-center space-x-2">
          <View className="w-10 h-10 bg-white rounded-xl items-center justify-center border border-orange-100 shadow-sm">
            <Image
              source={require("../assets/icon.png")}
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text className="text-xl font-poppins-bold text-margam-orange leading-tight">
              Mar<Text className="text-margam-yellow">gam</Text>
            </Text>
            <Text className="text-[8px] font-poppins-bold tracking-wider text-neutral-steel leading-none uppercase">
              Institution Hub
            </Text>
          </View>
        </View>

        {/* User profile & Sign Out */}
        <View className="flex-row items-center space-x-3">
          <View className="items-end hidden sm:flex">
            <Text className="text-xs font-inter-medium text-neutral-charcoal">{user?.primaryEmailAddress?.emailAddress}</Text>
            <Text className="text-[9px] font-poppins text-margam-orange">Active Member</Text>
          </View>
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center border border-orange-100"
          >
            <Ionicons name="log-out-outline" size={20} color="#FF5E00" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-poppins-bold text-neutral-charcoal">
            Welcome back, <Text className="text-margam-orange">{user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"}</Text> 👋
          </Text>
        </View>

        {/* STUDENT PORTAL SECTION */}
        {activePortal === "student" && (
          <View className="px-6 mb-8">
            <View className="bg-[#1A365D] rounded-3xl p-6 border-2 border-[#E5C158]/50 shadow-md">
              {/* Header Badge */}
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-white font-poppins-bold text-lg">{dummySeedData.student.name}</Text>
                  <Text className="text-gray-300 font-inter text-xs">{dummySeedData.student.class} | Roll No. {dummySeedData.student.rollNumber}</Text>
                </View>
                <View className="bg-[#E5C158] px-3 py-1 rounded-full">
                  <Text className="text-[#1A365D] font-opensans font-bold text-[9px] uppercase tracking-wider">
                    Student Hub 🎓
                  </Text>
                </View>
              </View>

              {/* Fee Reminder Banner */}
              <View className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl flex-row items-center space-x-3 mb-5">
                <Ionicons name="card-outline" size={20} color="#EF4444" />
                <Text className="text-red-200 font-inter-medium text-xs flex-1">{dummySeedData.student.feeReminder}</Text>
              </View>

              {/* Performance Section */}
              <Text className="text-[#E5C158] font-poppins-bold text-sm mb-3">Academic Exam Performance (Marks)</Text>
              <View className="space-y-3 bg-[#1d3f6d] p-4 rounded-2xl border border-white/5 mb-6">
                {dummySeedData.student.performance.map((item, index) => (
                  <View key={index} className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-white font-inter-medium text-sm">{item.subject}</Text>
                      <Text className="text-gray-400 font-inter text-[10px]">Instructor: {item.teacher}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-white font-poppins-bold text-sm">{item.marks}/100 Marks</Text>
                      <Text className="text-[#E5C158] font-inter text-[10px]">AI Score: {item.score}/10</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Homework and AI scoring */}
              <Text className="text-[#E5C158] font-poppins-bold text-sm mb-3">AI Homework scoring</Text>
              <View className="space-y-3 bg-[#1d3f6d] p-4 rounded-2xl border border-white/5">
                {dummySeedData.student.homework.map((hw, index) => (
                  <View key={index} className="flex-row justify-between items-center border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                    <View>
                      <Text className="text-white font-inter-medium text-xs">{hw.subject}</Text>
                      <Text className="text-gray-400 font-inter text-[10px]">Topic: {hw.topic}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[#E5C158] font-poppins-bold text-xs">{hw.score}</Text>
                      <Text className="text-gray-400 font-inter text-[9px]">{hw.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* TEACHER PORTAL SECTION */}
        {activePortal === "teacher" && (
          <View className="px-6 mb-8">
            <View className="bg-[#1C2C40] rounded-3xl p-6 border-2 border-[#E5C158]/50 shadow-md">
              {/* Header Badge */}
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-white font-poppins-bold text-lg">{dummySeedData.teacher.name}</Text>
                  <Text className="text-gray-300 font-inter text-xs">Specialization: {dummySeedData.teacher.subject}</Text>
                </View>
                <View className="bg-[#E5C158] px-3 py-1 rounded-full">
                  <Text className="text-[#1C2C40] font-opensans font-bold text-[9px] uppercase tracking-wider">
                    Teacher Portal 👩‍🏫
                  </Text>
                </View>
              </View>

              {/* Performance Indicator */}
              <View className="bg-[#243952] p-4 rounded-2xl border border-white/5 mb-6">
                <Text className="text-gray-400 font-inter text-xs">Instructor Performance Rating</Text>
                <Text className="text-[#E5C158] font-poppins-bold text-2xl mt-1">{dummySeedData.teacher.performanceIndex}</Text>
              </View>

              {/* Active Classes */}
              <Text className="text-[#E5C158] font-poppins-bold text-sm mb-3">Assigned Classes</Text>
              <View className="flex-row space-x-3 mb-6">
                {dummySeedData.teacher.classes.map((cls, index) => (
                  <View key={index} className="flex-1 bg-[#243952] py-3 rounded-xl border border-white/5 items-center">
                    <Text className="text-white font-poppins-bold text-xs">{cls}</Text>
                  </View>
                ))}
              </View>

              {/* Homework generation metrics */}
              <Text className="text-[#E5C158] font-poppins-bold text-sm mb-3">AI Homework Generator Actions</Text>
              <View className="space-y-3 bg-[#243952] p-4 rounded-2xl border border-white/5 mb-6">
                {dummySeedData.teacher.recentHomeworkCreated.map((hw, index) => (
                  <View key={index} className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-white font-inter-medium text-xs">{hw.subject}</Text>
                      <Text className="text-gray-400 font-inter text-[10px]">Chapter: {hw.chapter}</Text>
                    </View>
                    <View className="items-end">
                      <View className="bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30">
                        <Text className="text-orange-300 font-opensans font-bold text-[9px]">{hw.difficulty}</Text>
                      </View>
                      <Text className="text-gray-400 font-inter text-[8px] mt-1">{hw.date}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity className="w-full bg-[#E5C158] py-4 rounded-2xl items-center flex-row justify-center space-x-2">
                <Ionicons name="flash-outline" size={16} color="#1C2C40" />
                <Text className="text-[#1C2C40] font-poppins-bold text-sm">Generate AI Homework</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
