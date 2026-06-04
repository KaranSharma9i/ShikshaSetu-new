import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import { useTeacherDashboard } from "@/hooks/useTeacherDashboard";
import Header from "@/components/teacher/Header";
import Svg, { Circle } from "react-native-svg";
import dayjs from "dayjs";

// ─── Custom Skeleton Loader using Animated (Opacity Pulse) ───────────────────
function SkeletonBox({
  width = "100%",
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E5E2DA",
          opacity,
        },
        style,
      ]}
    />
  );
}

function DashboardSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {/* Subject pills skeleton */}
      <View className="flex-row space-x-3 mb-6">
        <SkeletonBox width={80} height={36} borderRadius={9999} />
        <SkeletonBox width={100} height={36} borderRadius={9999} />
        <SkeletonBox width={90} height={36} borderRadius={9999} />
      </View>
      {/* Stats cards skeleton */}
      <SkeletonBox height={130} borderRadius={16} style={{ marginBottom: 16 }} />
      <SkeletonBox height={130} borderRadius={16} style={{ marginBottom: 16 }} />
      <SkeletonBox height={130} borderRadius={16} style={{ marginBottom: 16 }} />
      {/* Top Students skeleton */}
      <SkeletonBox width={150} height={20} style={{ marginBottom: 12 }} />
      <SkeletonBox height={60} borderRadius={16} style={{ marginBottom: 10 }} />
      <SkeletonBox height={60} borderRadius={16} />
    </View>
  );
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface SubjectItem {
  id: string;
  name: string;
}

interface StudentPerformance {
  student_id: string;
  name: string;
  profile_photo_url: string | null;
  score: number | null;
  subject: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, role } = useAuth();
  
  const { stats, isLoading, error, refetch } = useTeacherDashboard();
  const [selectedSubject, setSelectedSubject] = useState<string>("All");

  // Redirect check
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/auth/signin");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F7F3EB]">
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const teacher = stats?.teacher;
  const subjects = stats?.subjects || [];
  const avgMarks = stats?.avgMarks ?? null;
  const avgAiScore = stats?.avgAiScore ?? 7.8;
  const pendingHomeworkCount = stats?.pendingHomeworkCount ?? 0;
  
  let homeworkDueString = "⏰ No active homeworks";
  if (stats?.closestHomework) {
    const dueTime = new Date(stats.closestHomework.due_date);
    const now = new Date();
    const diffMs = dueTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) {
      homeworkDueString = "⏰ Overdue";
    } else if (diffHours < 1) {
      homeworkDueString = `⏰ Due in ${diffMins} minutes`;
    } else if (diffHours <= 24) {
      homeworkDueString = `⏰ Due in ${diffHours} hours`;
    } else {
      homeworkDueString = `⏰ Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    }
  }

  const topStudents = stats?.topStudents || [];


  // Safe Avatar Initial Helper
  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Rendering Avg Marks Progress Bar
  const renderProgressBar = (value: number | null) => {
    const pct = value || 0;
    return (
      <View className="h-2 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
        <View
          style={{ width: `${pct}%`, backgroundColor: "#D4AF37" }}
          className="h-full rounded-full"
        />
      </View>
    );
  };

  // Rendering SVG Circular Ring for AI Score
  const renderCircularGauge = (score: number) => {
    const size = 68;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    // Score is out of 10. Represent score as percentage: (score / 10) * 100
    const scorePercentage = (score / 10) * 100;
    const offset = circumference - (scorePercentage / 100) * circumference;

    return (
      <View style={{ width: size, height: size }} className="justify-center items-center">
        <Svg width={size} height={size}>
          {/* Base Navy Track Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#0D1B2A"
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.1}
          />
          {/* Active Gold Circle Progress */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#D4AF37"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View className="absolute items-center justify-center">
          <Text className="font-poppins-bold text-[13px] text-[#0D1B2A]">AI</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      {/* 1. Header */}
      <Header title="Dashboard" showBack={false} />

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text className="font-poppins-semibold text-base text-[#0D1B2A] mt-3">
            Couldn't load dashboard
          </Text>
          <Text className="font-inter text-xs text-gray-500 text-center mt-1.5 mb-5">
            {error}
          </Text>
          <TouchableOpacity
            onPress={refetch}
            className="bg-[#D4AF37] px-6 py-2.5 rounded-full"
          >
            <Text className="font-poppins-bold text-xs text-[#0D1B2A]">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 2. Greeting Text */}
          <View className="px-4 pt-6 pb-4">
            <Text className="font-inter text-gray-500 text-sm">Namaste 🙏</Text>
            <Text className="font-poppins-bold text-2xl text-[#0D1B2A] leading-tight mt-1">
              {teacher?.name || "Teacher"}
            </Text>
          </View>

          {/* 3. Subject Filter Pills */}
          <View className="mb-6">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                gap: 8,
                alignItems: 'center',
              }}
              style={{ flexGrow: 0 }}
            >
              {/* "All" pill */}
              <TouchableOpacity
                onPress={() => setSelectedSubject("All")}
                activeOpacity={0.8}
                style={{ paddingHorizontal: 16, paddingVertical: 8 }}
                className={`rounded-full border ${
                  selectedSubject === "All"
                    ? "bg-[#D4AF37] border-[#D4AF37]"
                    : "bg-white border-[#0D1B2A]"
                }`}
              >
                <Text
                  className={`font-inter-medium text-xs ${
                    selectedSubject === "All" ? "text-[#0D1B2A]" : "text-[#0D1B2A]"
                  }`}
                >
                  All Subjects
                </Text>
              </TouchableOpacity>

              {subjects.map((sub) => {
                const isSelected = selectedSubject === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setSelectedSubject(sub.id)}
                    activeOpacity={0.8}
                    style={{ paddingHorizontal: 16, paddingVertical: 8 }}
                    className={`rounded-full border ${
                      isSelected
                        ? "bg-[#D4AF37] border-[#D4AF37]"
                        : "bg-white border-[#0D1B2A]"
                    }`}
                  >
                    <Text className="font-inter-medium text-xs text-[#0D1B2A]">
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. Stats Cards Stack */}
          <View className="px-4 space-y-4">
            {/* Avg Marks Card */}
            <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center">
                    <Feather name="trending-up" size={20} color="#0D1B2A" />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: 'OpenSans-Bold',
                        fontSize: 11,
                        fontWeight: '700',
                        letterSpacing: 0.8,
                        color: '#44474C',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Avg Marks
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Poppins-Bold',
                        fontSize: 32,
                        fontWeight: '700',
                        color: '#0D1B2A',
                      }}
                    >
                      {avgMarks !== null ? `${avgMarks}%` : "—"}
                    </Text>
                  </View>
                </View>

                {/* // TODO: dynamic delta badge (+2.4% badge skipped for now) */}
              </View>
              {renderProgressBar(avgMarks)}
            </View>

            {/* Avg AI Score Card */}
            <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text
                  style={{
                    fontFamily: 'OpenSans-Bold',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                    color: '#44474C',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Avg AI Score
                </Text>
                <Text
                  style={{
                    fontFamily: 'Poppins-Bold',
                    fontSize: 32,
                    fontWeight: '700',
                    color: '#0D1B2A',
                  }}
                >
                  {avgAiScore}/10
                </Text>
                <Text className="font-inter text-gray-400 text-xs mt-2">
                  Quality of Lesson Delivery
                </Text>
              </View>
              {renderCircularGauge(avgAiScore)}
            </View>

            {/* Homeworks Card */}
            <View
              style={{
                borderLeftWidth: 4,
                borderLeftColor: '#DC2626',
                borderRadius: 16,
              }}
              className="bg-white p-5 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text
                    style={{
                      fontFamily: 'OpenSans-Bold',
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 0.8,
                      color: '#44474C',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Homeworks
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Poppins-Bold',
                      fontSize: 32,
                      fontWeight: '700',
                      color: '#0D1B2A',
                    }}
                  >
                    {pendingHomeworkCount}
                  </Text>
                </View>
                {pendingHomeworkCount > 0 && (
                  <View className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    <Text className="font-poppins-semibold text-[9px] text-[#DC2626] tracking-wider uppercase">
                      PENDING
                    </Text>
                  </View>
                )}
              </View>
              <Text className="font-inter-medium text-[#DC2626] text-xs mt-3">
                {homeworkDueString}
              </Text>
            </View>
          </View>

          {/* 5. Top Performing Students */}
          <View className="px-4 mt-8">
            <View className="flex-row justify-between items-end mb-4">
              <Text className="font-poppins-semibold text-lg text-[#0D1B2A]">
                Top Performing Students
              </Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text className="font-inter-medium text-xs text-[#D4AF37] underline">
                  See All
                </Text>
              </TouchableOpacity>
            </View>

            <View className="space-y-2.5">
              {topStudents.map((student, index) => (
                <View
                  key={student.student_id || index}
                  className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-gray-100 shadow-sm"
                >
                  <View className="flex-row items-center space-x-3 flex-1">
                    {/* Avatar circle */}
                    {student.profile_photo_url ? (
                      <Image
                        source={{ uri: student.profile_photo_url }}
                        className="w-10 h-10 rounded-full border border-gray-100"
                      />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-[#E5E2DA] items-center justify-center border border-gray-200">
                        <Text className="font-poppins-bold text-xs text-[#0D1B2A]">
                          {getInitials(student.name)}
                        </Text>
                      </View>
                    )}

                    <View className="flex-1 pr-2">
                      <Text
                        className="font-inter-medium text-sm text-[#0D1B2A]"
                        numberOfLines={1}
                      >
                        {student.name}
                      </Text>
                      <Text className="font-inter text-gray-400 text-[11px] mt-0.5">
                        {student.subject}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="font-poppins-bold text-[#D4AF37] text-base">
                      {student.score !== null ? `${student.score}%` : "—"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
