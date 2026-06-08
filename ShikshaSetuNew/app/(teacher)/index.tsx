import React, { useEffect, useRef } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { useTeacherDashboard } from "@/hooks/useTeacherDashboard";
import Header from "@/components/teacher/Header";
import CircularProgress from "@/components/student/CircularProgress";

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
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
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
          backgroundColor: "#E5E7EB",
          opacity,
        },
        style,
      ]}
    />
  );
}

function DashboardSkeleton() {
  const { theme } = useAuth();
  const creamColor = theme?.colors?.cream ?? "#F9F6EF";
  return (
    <View style={{ flex: 1, backgroundColor: creamColor, padding: 20 }}>
      {/* Hero card skeleton */}
      <SkeletonBox width="100%" height={160} borderRadius={20} style={{ marginBottom: 16 }} />
      {/* Metric cards skeleton */}
      <SkeletonBox width="100%" height={100} borderRadius={20} style={{ marginBottom: 16 }} />
      <SkeletonBox width="100%" height={120} borderRadius={20} style={{ marginBottom: 16 }} />
      <SkeletonBox width="100%" height={100} borderRadius={20} style={{ marginBottom: 16 }} />
      {/* Quick actions skeleton */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <SkeletonBox width="47%" height={90} borderRadius={16} />
        <SkeletonBox width="47%" height={90} borderRadius={16} />
      </View>
    </View>
  );
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, role, theme } = useAuth();
  const { stats, classTeacherInfo, isLoading, error, refetch } = useTeacherDashboard();

  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#ffe088";
  const creamColor = theme?.colors?.cream ?? "#F9F6EF";

  // Redirect check
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/auth/signin");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: creamColor }}>
        <ActivityIndicator size="large" color={secondaryColor} />
      </View>
    );
  }

  // Redirect non-teachers
  if (role && role !== "teacher") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: creamColor }}>
        <ActivityIndicator size="large" color={secondaryColor} />
      </View>
    );
  }

  const teacher = stats?.teacher;
  const avgMarks = stats?.avgMarks ?? null;
  const avgAiScore = stats?.avgAiScore ?? 7.8;
  const pendingHomeworkCount = stats?.pendingHomeworkCount ?? 0;
  const topStudents = stats?.topStudents || [];

  let homeworkDueString = "⏰ No active homeworks";
  if (pendingHomeworkCount > 0) {
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
    } else {
      homeworkDueString = `⏰ ${pendingHomeworkCount} active homework${pendingHomeworkCount !== 1 ? "s" : ""}`;
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const quickActions = [
    { label: "Homework", icon: "document-text-outline" as const, route: "/(teacher)/teacher-homework", color: "#2563EB", bg: "#EFF6FF" },
    { label: "Students", icon: "people-outline" as const, route: "/(teacher)/teacher-students", color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Marks", icon: "ribbon-outline" as const, route: "/(teacher)/more/marks", color: "#0891B2", bg: "#ECFEFF" },
    { label: "More", icon: "grid-outline" as const, route: "/(teacher)/more", color: "#059669", bg: "#ECFDF5" },
  ];

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: creamColor }}>
      {/* Status bar padding for Android */}
      {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}

      {/* Header */}
      <Header title="Dashboard" showBack={false} />

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: primaryColor, marginTop: 12 }}>
            Couldn't load dashboard
          </Text>
          <Text style={{ fontFamily: "Inter-Regular", fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 6, marginBottom: 20 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={refetch}
            style={{ backgroundColor: secondaryColor, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 100 }}
          >
            <Text style={{ fontFamily: "Poppins-Bold", color: primaryColor, fontSize: 13 }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Welcome Hero Card ─────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: primaryColor,
                borderRadius: 24,
                padding: 20,
                overflow: "hidden",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Inter-Regular", fontSize: 13, color: "#9CA3AF", marginBottom: 2 }}>
                    Namaste 🙏
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 20,
                      color: "#FFFFFF",
                      lineHeight: 26,
                    }}
                    numberOfLines={2}
                  >
                    {teacher?.name || "Teacher"}
                  </Text>
                </View>
              </View>

              {classTeacherInfo && (
                <>
                  {/* Divider */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#FFFFFF12",
                      marginVertical: 14,
                    }}
                  />

                  {/* Class Teacher Chip */}
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#FFFFFF0D",
                        borderRadius: 100,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        gap: 5,
                      }}
                    >
                      <Ionicons name="school-outline" size={12} color={secondaryColor} />
                      <Text
                        style={{
                          fontFamily: "Inter-Medium",
                          fontSize: 11,
                          color: "#D1D5DB",
                        }}
                      >
                        🏫 Class Teacher · {classTeacherInfo.class_name.toLowerCase().includes("class") ? classTeacherInfo.class_name : `Class ${classTeacherInfo.class_name}`} · {classTeacherInfo.section_name.toLowerCase().includes("section") ? classTeacherInfo.section_name : `Section ${classTeacherInfo.section_name}`}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* ── Metric Cards ────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            {/* Avg Marks Card */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
                borderColor: "#F3F4F6",
                borderWidth: 1,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 11,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                Avg Marks
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 32,
                  color: primaryColor,
                }}
              >
                {avgMarks !== null ? `${avgMarks}%` : "—"}
              </Text>
              <View style={{ height: 8, width: "100%", backgroundColor: "#F3F4F6", borderRadius: 9999, marginTop: 12, overflow: "hidden" }}>
                <View style={{ width: `${avgMarks || 0}%`, backgroundColor: secondaryColor, height: "100%", borderRadius: 9999 }} />
              </View>
            </View>

            {/* Avg AI Score Card */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
                borderColor: "#F3F4F6",
                borderWidth: 1,
                marginBottom: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 11,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  Avg AI Score
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins-Bold",
                    fontSize: 32,
                    color: primaryColor,
                  }}
                >
                  {avgAiScore}/10
                </Text>
                <Text style={{ fontFamily: "Inter-Regular", color: "#9CA3AF", fontSize: 12, marginTop: 8 }}>
                  Quality of Lesson Delivery
                </Text>
              </View>
              <CircularProgress
                percentage={avgAiScore * 10}
                size={80}
                strokeWidth={8}
                color={secondaryColor}
              >
                <Text style={{ fontFamily: "Poppins-Bold", fontSize: 14, color: primaryColor }}>
                  {avgAiScore}
                </Text>
              </CircularProgress>
            </View>

            {/* Homeworks Card */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
                borderColor: "#F3F4F6",
                borderWidth: 1,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 11,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                Homeworks
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 32,
                  color: primaryColor,
                }}
              >
                {pendingHomeworkCount}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 12,
                  color: pendingHomeworkCount > 0 ? "#16A34A" : "#EF4444",
                  marginTop: 12,
                }}
              >
                {homeworkDueString}
              </Text>
            </View>
          </View>

          {/* ── Quick Action Grid ─────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 13,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.8}
                  style={{
                    width: "47%",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "flex-start",
                    gap: 10,
                    borderColor: "#F3F4F6",
                    borderWidth: 1,
                    shadowColor: "#000",
                    shadowOpacity: 0.02,
                    shadowRadius: 5,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: action.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={action.icon} size={18} color={action.color} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 13,
                      color: "#111827",
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Top Performing Students ───────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 13,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Top Performing Students
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(teacher)/teacher-students" as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 12,
                    color: secondaryColor,
                  }}
                >
                  See All →
                </Text>
              </TouchableOpacity>
            </View>

            {topStudents.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                  borderColor: "#F3F4F6",
                  borderWidth: 1,
                }}
              >
                <Ionicons name="people-outline" size={32} color="#D1D5DB" />
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 13,
                    color: "#9CA3AF",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  No students found
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  overflow: "hidden",
                  borderColor: "#F3F4F6",
                  borderWidth: 1,
                }}
              >
                {topStudents.map((student, index) => (
                  <View
                    key={student.student_id || index}
                    style={{
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderBottomWidth: index < topStudents.length - 1 ? 1 : 0,
                      borderBottomColor: "#F9FAFB",
                    }}
                  >
                    {student.profile_photo_url ? (
                      <Image
                        source={{ uri: student.profile_photo_url }}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9999,
                          borderColor: "#F3F4F6",
                          borderWidth: 1,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9999,
                          backgroundColor: secondaryLightColor + "20",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontFamily: "Poppins-Bold", fontSize: 11, color: secondaryColor }}>
                          {getInitials(student.name)}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Inter-Medium",
                          fontSize: 13,
                          color: "#111827",
                        }}
                        numberOfLines={1}
                      >
                        {student.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter-Regular",
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                        }}
                      >
                        {student.subject}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 14,
                        color: secondaryColor,
                      }}
                    >
                      {student.score !== null ? `${student.score}%` : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
