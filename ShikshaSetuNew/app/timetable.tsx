import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/useAuth";
import {
  getStudentProfileByUserId,
  getStudentAcademicYear,
  getStudentTimetable,
} from "../src/repositories/studentRepository";
import BottomNavBar from "../components/student/BottomNavBar";

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat", isWeekend: true },
  { key: "sunday", label: "Sun", isWeekend: true }
];

export default function TimetableScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  const [isLoading, setIsLoading] = useState(true);
  const [isTimetableLoading, setIsTimetableLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [academicYear, setAcademicYear] = useState<any>(null);
  
  // Set default selected day
  const todayIndex = new Date().getDay();
  const todayName = dayNames[todayIndex];
  const initialDay = (todayName === "saturday" || todayName === "sunday") ? "monday" : todayName;
  const [selectedDay, setSelectedDay] = useState<string>(initialDay);
  const [timetable, setTimetable] = useState<any[]>([]);

  // Format time helper: "08:00:00" -> "08:00"
  const formatTime = (t: string) => (t && t.length >= 5) ? t.slice(0, 5) : t;

  // Fetch student profile & academic year
  useEffect(() => {
    async function loadStudentData() {
      if (!userId) return;
      setIsLoading(true);
      try {
        const studentProfile = await getStudentProfileByUserId(userId);
        if (studentProfile) {
          setProfile(studentProfile);
          const ay = await getStudentAcademicYear(studentProfile.institution_id || "");
          setAcademicYear(ay);
        }
      } catch (err) {
        console.error("Failed to load student profile/academic year:", err);
        Alert.alert("Error", "Failed to load schedule details.");
      } finally {
        setIsLoading(false);
      }
    }
    loadStudentData();
  }, [userId]);

  // Fetch timetable when selectedDay changes
  useEffect(() => {
    async function loadTimetable() {
      if (!profile || !academicYear || !selectedDay) return;
      setIsTimetableLoading(true);
      try {
        // If selected day is weekend, show empty timetable (Sat/Sun has no classes)
        if (selectedDay === "saturday" || selectedDay === "sunday") {
          setTimetable([]);
        } else {
          const list = await getStudentTimetable(
            profile.section_id || "",
            academicYear.id || "",
            selectedDay
          );
          setTimetable(list || []);
        }
      } catch (err) {
        console.error("Failed to load timetable:", err);
      } finally {
        setIsTimetableLoading(false);
      }
    }
    loadTimetable();
  }, [profile, academicYear, selectedDay]);

  const getAccentColor = (subjectName: string) => {
    const lower = (subjectName || "").toLowerCase();
    if (lower.includes("math")) return "bg-blue-500";
    if (lower.includes("science")) return "bg-green-500";
    if (lower.includes("english")) return "bg-purple-500";
    if (lower.includes("hindi")) return "bg-orange-500";
    if (lower.includes("history")) return "bg-[#8B4513]"; // Brown
    return "bg-[#0D1B2A]"; // Default Navy
  };

  const renderTimetableContent = () => {
    if (isTimetableLoading) {
      // Skeletons
      return (
        <View className="px-4 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <View 
              key={i} 
              className="flex-row items-stretch bg-white rounded-2xl mb-3 border border-gray-100/50 shadow-sm overflow-hidden h-24 animate-pulse"
            >
              <View className="w-1.5 bg-gray-200" />
              <View className="flex-1 p-4 justify-between">
                <View className="flex-row justify-between">
                  <View className="w-16 h-3 bg-gray-200 rounded" />
                  <View className="w-24 h-3 bg-gray-200 rounded" />
                </View>
                <View className="w-32 h-5 bg-gray-200 rounded my-1" />
                <View className="flex-row space-x-4">
                  <View className="w-20 h-3 bg-gray-200 rounded" />
                  <View className="w-16 h-3 bg-gray-200 rounded" />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (selectedDay === "saturday" || selectedDay === "sunday" || timetable.length === 0) {
      // Empty state
      return (
        <View className="flex-1 justify-center items-center px-6 py-20">
          <View className="w-16 h-16 rounded-full bg-gray-100 justify-center items-center mb-4">
            <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
          </View>
          <Text className="font-poppins-medium text-lg text-[#0D1B2A] text-center">
            No classes today
          </Text>
          <Text className="font-inter text-sm text-gray-500 text-center mt-1">
            Enjoy your day!
          </Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1 px-4 mt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {timetable.map((item, index) => (
          <View 
            key={index} 
            className="flex-row items-stretch bg-white rounded-2xl mb-3 border border-gray-100/50 shadow-sm overflow-hidden"
          >
            {/* Left Colored Accent Bar */}
            <View className={`w-1.5 ${getAccentColor(item.subject_name)}`} />
            
            {/* Main Content */}
            <View className="flex-1 p-4">
              <View className="flex-row justify-between items-center">
                <Text className="font-inter text-[11px] text-gray-400 uppercase tracking-wider">
                  Period {item.period_number}
                </Text>
                <Text className="font-inter text-[11px] text-gray-400">
                  {formatTime(item.starts_at)} - {formatTime(item.ends_at)}
                </Text>
              </View>
              
              <Text className="font-poppins-semibold text-[16px] text-[#0D1B2A] mt-1.5 mb-2">
                {item.subject_name}
              </Text>
              
              <View className="flex-row items-center mt-0.5 space-x-4">
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text className="font-inter text-[13px] text-gray-500">
                    {item.teacher_name}
                  </Text>
                </View>
                {item.room ? (
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text className="font-inter text-[13px] text-gray-500">
                      Room {item.room}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#fbf9f8] justify-center items-center">
        <ActivityIndicator size="large" color="#0D1B2A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fbf9f8]">
      {/* Custom Header */}
      <View 
        className="bg-white border-b border-[#E5E7EB] px-5 flex-row items-center justify-between z-50"
        style={{
          paddingTop: Platform.OS === "android" ? statusBarHeight + 15 : 45,
          paddingBottom: 15,
        }}
      >
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="p-1"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        
        <Text className="font-poppins-semibold text-lg text-[#0D1B2A] text-center flex-1">
          Class Schedule
        </Text>
        
        <TouchableOpacity
          onPress={() => Alert.alert("Notifications", "You have no new updates.")}
          className="p-1"
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color="#0D1B2A" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Day Selector */}
      <View className="bg-white py-3 border-b border-gray-100">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <View className="flex-row space-x-2">
            {DAYS.map((day) => {
              const isSelected = selectedDay === day.key;
              
              let pillStyle = "px-4 py-2.5 rounded-full items-center justify-center ";
              let textStyle = "font-poppins-medium text-xs ";
              
              if (isSelected) {
                pillStyle += "bg-[#0D1B2A]";
                textStyle += "text-white";
              } else if (day.isWeekend) {
                pillStyle += "bg-gray-100 border border-gray-200";
                textStyle += "text-gray-400";
              } else {
                pillStyle += "bg-white border border-[#0D1B2A]";
                textStyle += "text-[#0D1B2A]";
              }

              return (
                <TouchableOpacity
                  key={day.key}
                  onPress={() => setSelectedDay(day.key)}
                  className={pillStyle}
                  activeOpacity={0.7}
                >
                  <Text className={textStyle}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Timetable Content list or Skeletons or Empty state */}
      {renderTimetableContent()}

      {/* @ts-ignore */}
      <BottomNavBar activeTab="profile" />
    </View>
  );
}
