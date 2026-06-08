import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";
import {
  getTeacherProfileByUserId,
  getTeacherClassesTaught,
  getTeacherSectionDetails,
} from "@/src/repositories/teacherRepository";

// ─── Animated Skeleton Box (Opacity Pulse) ───────────────────
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

function StudentListSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {/* Pills row skeleton */}
      <View className="flex-row space-x-2.5 mb-5">
        <SkeletonBox width={90} height={36} borderRadius={9999} />
        <SkeletonBox width={100} height={36} borderRadius={9999} />
        <SkeletonBox width={90} height={36} borderRadius={9999} />
      </View>
      {/* Stats Cards Row skeleton */}
      <View className="flex-row justify-between mb-6 space-x-2.5">
        <SkeletonBox width="30%" height={80} borderRadius={12} />
        <SkeletonBox width="30%" height={80} borderRadius={12} />
        <SkeletonBox width="30%" height={80} borderRadius={12} />
      </View>
      {/* Headers skeleton */}
      <SkeletonBox height={20} borderRadius={4} style={{ marginBottom: 12 }} />
      {/* Rows skeleton */}
      <View className="space-y-3">
        <SkeletonBox height={64} borderRadius={12} />
        <SkeletonBox height={64} borderRadius={12} />
        <SkeletonBox height={64} borderRadius={12} />
        <SkeletonBox height={64} borderRadius={12} />
        <SkeletonBox height={64} borderRadius={12} />
      </View>
    </View>
  );
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface ClassSectionItem {
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  label: string;
}

interface StudentItem {
  id: string;
  roll_number: string | null;
  student_code: string;
  full_name: string;
  avatar_url: string | null;
  marks: number | null;
  ai_score: number | null;
  trend: "improving" | "declining" | "stable";
}

export default function StudentListScreen() {
  const router = useRouter();
  const { userId, isLoaded, isSignedIn, theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const creamColor = theme?.colors?.cream ?? "#F7F3EB";

  // Loading and Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Teacher Profile Data
  const [teacher, setTeacher] = useState<any>(null);

  // Classes state
  const [classes, setClasses] = useState<ClassSectionItem[]>([]);

  // Selected class state
  const [selectedClass, setSelectedClass] = useState<ClassSectionItem | null>(null);

  // Aggregate Stats state
  const [classAvg, setClassAvg] = useState<string>("—");
  const [aiTalentScore, setAiTalentScore] = useState<string>("—");
  const [attendanceRate, setAttendanceRate] = useState<string>("—");

  // Student Table state
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      loadTeacherAndClasses();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadTeacherAndClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch teacher record using auth userId
      if (!userId) {
        setError("Could not load teacher profile");
        setLoading(false);
        return;
      }
      const teacherProfileData = await getTeacherProfileByUserId(userId);
      if (!teacherProfileData) {
        setError("Could not load teacher profile");
        setLoading(false);
        return;
      }

      setTeacher(teacherProfileData);

      // 2. Fetch distinct classes & sections taught by teacher
      const uniqueClasses = await getTeacherClassesTaught(teacherProfileData.id);
      setClasses(uniqueClasses);

      if (uniqueClasses.length > 0) {
        setSelectedClass(uniqueClasses[0]);
      } else {
        setSelectedClass(null);
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to load setup data:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  // Load stats and students when tab selection changes
  useEffect(() => {
    if (selectedClass) {
      loadTabDetails(selectedClass);
    }
  }, [selectedClass?.section_id]);

  const loadTabDetails = async (tab: ClassSectionItem) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      if (!teacher) return;

      const details = await getTeacherSectionDetails(
        teacher.id,
        tab.section_id,
        tab.class_id
      );

      setClassAvg(details.classAvg);
      setAiTalentScore(details.aiTalentScore);
      setAttendanceRate(details.attendanceRate);
      setStudents(details.students);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load tab details:", err);
      setError("Could not load class analytics");
      setLoading(false);
    }
  };

  // Helper for initials
  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Render AI score badges
  const renderAiBadge = (score: number | null) => {
    if (score === null) {
      return (
        <View className="bg-gray-100 px-2 py-1 rounded-[6px] items-center justify-center min-w-[40px]">
          <Text className="font-poppins-bold text-[13px]" style={{ color: primaryColor }}>—</Text>
        </View>
      );
    }

    let bgStyle: any = { backgroundColor: "#F0EDED" };
    let textStyle: any = { color: primaryColor };

    if (score >= 8.0) {
      bgStyle = { backgroundColor: secondaryColor };
      textStyle = { color: primaryColor };
    } else if (score < 6.0) {
      bgStyle = { backgroundColor: "#FFE0E0" };
      textStyle = { color: "#DC2626" };
    }

    return (
      <View style={[{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center", justifyContent: "center", minWidth: 40 }, bgStyle]}>
        <Text className="font-poppins-bold text-[13px]" style={textStyle}>
          {score.toFixed(1)}
        </Text>
      </View>
    );
  };

  // Render trend icon
  const renderTrendIcon = (trend: "improving" | "declining" | "stable") => {
    if (trend === "improving") {
      return <Feather name="trending-up" size={16} color="#16A34A" />;
    } else if (trend === "declining") {
      return <Feather name="trending-down" size={16} color="#DC2626" />;
    }
    return <Feather name="minus" size={16} color="#9CA3AF" />;
  };

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const paginatedStudents = students.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <View className="flex-1" style={{ backgroundColor: creamColor }}>
      {/* Header */}
      <Header title="Students" showBack={false} />

      {/* Tabs / Loading / List View */}
      {loading && classes.length === 0 ? (
        <StudentListSkeleton />
      ) : classes.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6" style={{ backgroundColor: creamColor }}>
          <Ionicons name="people-outline" size={48} color={secondaryColor} />
          <Text className="font-poppins-bold text-base mt-3" style={{ color: primaryColor }}>
            No students assigned yet
          </Text>
          <Text className="font-inter text-xs text-gray-500 text-center mt-1.5">
            No students assigned yet. Contact your administrator.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Class Tab Pills */}
          {classes.length > 0 && (
            <View className="my-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 8,
                  alignItems: "center",
                }}
                style={{ flexGrow: 0 }}
              >
                {classes.map((item) => {
                  const isSelected = selectedClass?.section_id === item.section_id;
                  return (
                    <TouchableOpacity
                      key={item.section_id}
                      onPress={() => setSelectedClass(item)}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        backgroundColor: isSelected ? secondaryColor : "#FFFFFF",
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: primaryColor,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: primaryColor,
                        }}
                        className={isSelected ? "font-poppins-semibold" : "font-poppins-medium"}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {error && (
            <View className="mx-4 my-2 bg-red-50 p-4 rounded-xl border border-red-200 flex-row items-center justify-between">
              <Text className="font-inter text-red-700 text-sm flex-1 mr-2">{error}</Text>
              <TouchableOpacity
                onPress={() => selectedClass ? loadTabDetails(selectedClass) : loadTeacherAndClasses()}
                className="bg-white border border-red-300 px-3 py-1.5 rounded-lg"
              >
                <Text className="font-inter-medium text-red-700 text-xs">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!error && selectedClass && (
            <>
              {/* 2. Stats Row */}
              <View style={{ flexDirection: "row", gap: 6 }} className="px-4 mb-6">
                {/* Stat 1: Class Average */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    shadowColor: "rgba(0,0,0,0.04)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 2,
                    paddingHorizontal: 8,
                    paddingVertical: 10,
                  }}
                  className="relative min-h-[82px] justify-between"
                >
                  <View className="flex-row justify-between items-start">
                    <Text
                      style={{
                        fontFamily: "OpenSans-Bold",
                        fontSize: 9,
                        fontWeight: "700",
                        color: secondaryColor,
                        letterSpacing: 0.5,
                      }}
                    >
                      CLASS AVERAGE
                    </Text>
                    <Ionicons name="star" size={16} color={secondaryColor} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 16,
                      fontWeight: "700",
                      color: primaryColor,
                      marginTop: 6,
                    }}
                  >
                    {classAvg}
                  </Text>
                </View>

                {/* Stat 2: AI Score */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    shadowColor: "rgba(0,0,0,0.04)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 2,
                    paddingHorizontal: 8,
                    paddingVertical: 10,
                  }}
                  className="relative min-h-[82px] justify-between"
                >
                  <View className="flex-row justify-between items-start">
                    <Text
                      style={{
                        fontFamily: "OpenSans-Bold",
                        fontSize: 9,
                        fontWeight: "700",
                        color: secondaryColor,
                        letterSpacing: 0.5,
                      }}
                    >
                      AI TALENT SCORE
                    </Text>
                    <Ionicons name="bulb" size={16} color={secondaryColor} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 16,
                      fontWeight: "700",
                      color: primaryColor,
                      marginTop: 6,
                    }}
                  >
                    {aiTalentScore}
                  </Text>
                </View>

                {/* Stat 3: Attendance */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    shadowColor: "rgba(0,0,0,0.04)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 2,
                    paddingHorizontal: 8,
                    paddingVertical: 10,
                  }}
                  className="relative min-h-[82px] justify-between"
                >
                  <View className="flex-row justify-between items-start">
                    <Text
                      style={{
                        fontFamily: "OpenSans-Bold",
                        fontSize: 9,
                        fontWeight: "700",
                        color: secondaryColor,
                        letterSpacing: 0.5,
                      }}
                    >
                      ATTENDANCE
                    </Text>
                    <Ionicons name="checkbox" size={16} color={secondaryColor} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 16,
                      fontWeight: "700",
                      color: primaryColor,
                      marginTop: 6,
                    }}
                  >
                    {attendanceRate}
                  </Text>
                </View>
              </View>

              {/* 3. Student Table */}
              <View className="px-4">
                {/* Column Headers */}
                <View className="flex-row items-center justify-between py-2 px-3 mb-2">
                  <View style={{ flex: 2.5 }}>
                    <Text
                      style={{ fontFamily: "OpenSans-Bold", fontSize: 11, letterSpacing: 0.55 }}
                      className="text-[#44474C] uppercase font-bold"
                    >
                      Student Name
                    </Text>
                  </View>
                  <View style={{ flex: 1.2 }} className="items-end pr-2">
                    <Text
                      style={{ fontFamily: "OpenSans-Bold", fontSize: 11, letterSpacing: 0.55 }}
                      className="text-[#44474C] uppercase font-bold text-right"
                    >
                      Marks (%)
                    </Text>
                  </View>
                  <View style={{ flex: 1.2 }} className="items-end pr-2">
                    <Text
                      style={{ fontFamily: "OpenSans-Bold", fontSize: 11, letterSpacing: 0.55 }}
                      className="text-[#44474C] uppercase font-bold text-right"
                    >
                      AI Score
                    </Text>
                  </View>
                  <View style={{ width: 32 }} className="items-end">
                    <Feather name="trending-up" size={14} color="#9CA3AF" />
                  </View>
                </View>

                {/* Table Rows or Skeletons */}
                {loading ? (
                  <View className="space-y-3">
                    <SkeletonBox height={64} borderRadius={12} />
                    <SkeletonBox height={64} borderRadius={12} />
                    <SkeletonBox height={64} borderRadius={12} />
                  </View>
                ) : students.length === 0 ? (
                  <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-100 shadow-sm mt-2">
                    <Ionicons name="people-outline" size={48} color={secondaryColor} />
                    <Text className="font-inter-medium text-[#44474C] text-sm mt-3 text-center">
                      No students in this class
                    </Text>
                  </View>
                ) : (
                  <View className="space-y-2">
                    {paginatedStudents.map((student) => (
                      <TouchableOpacity
                        key={student.id}
                        onPress={() =>
                          router.push({
                            pathname: "/(teacher)/teacher-students/[id]" as any,
                            params: { id: student.id },
                          })
                        }
                        activeOpacity={0.7}
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: 12,
                          shadowColor: "rgba(0,0,0,0.04)",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 1,
                          shadowRadius: 8,
                          elevation: 2,
                        }}
                        className="p-3 flex-row items-center justify-between border border-gray-100"
                      >
                        {/* Left Avatar + Name Info */}
                        <View style={{ flex: 2.5 }} className="flex-row items-center space-x-3">
                          {student.avatar_url ? (
                            <Image
                              source={{ uri: student.avatar_url }}
                              className="w-10 h-10 rounded-full border border-gray-100"
                            />
                          ) : (
                            <View className="w-10 h-10 rounded-full items-center justify-center border border-gray-200" style={{ backgroundColor: primaryColor }}>
                              <Text className="font-poppins-bold text-[16px]" style={{ color: secondaryColor }}>
                                {getInitials(student.full_name)}
                              </Text>
                            </View>
                          )}

                          <View className="flex-1 pr-1">
                            <Text
                              className="font-inter-semibold text-sm leading-tight"
                              style={{ color: primaryColor }}
                              numberOfLines={1}
                            >
                              {student.full_name}
                            </Text>
                            <Text
                              style={{ fontFamily: "OpenSans" }}
                              className="text-gray-400 text-[11px] mt-0.5"
                            >
                              ID: {student.student_code}
                            </Text>
                          </View>
                        </View>

                        {/* Marks */}
                        <View style={{ flex: 1.2 }} className="items-end pr-2">
                          <Text className="font-inter-bold text-[15px] text-right" style={{ color: primaryColor }}>
                            {student.marks !== null ? `${student.marks}%` : "—"}
                          </Text>
                        </View>

                        {/* AI Score Badge */}
                        <View style={{ flex: 1.2 }} className="items-end pr-2">
                          {renderAiBadge(student.ai_score)}
                        </View>

                        {/* Trend Icon */}
                        <View style={{ width: 32 }} className="items-end justify-center pr-2">
                          {renderTrendIcon(student.trend)}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Pagination Controls */}
                {!loading && students.length > 0 && (
                  <View className="flex-row items-center justify-between mt-6 px-1">
                    <Text style={{ fontFamily: "OpenSans" }} className="text-gray-400 text-[12px]">
                      Showing {Math.min(students.length, (currentPage - 1) * pageSize + 1)}-
                      {Math.min(students.length, currentPage * pageSize)} of {students.length}{" "}
                      students
                    </Text>

                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        activeOpacity={0.7}
                        style={{
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: primaryColor,
                          backgroundColor: currentPage === 1 ? "rgba(13,27,42,0.05)" : "#FFFFFF",
                          opacity: currentPage === 1 ? 0.4 : 1,
                        }}
                        className="px-3 py-2 items-center justify-center"
                      >
                        <Text className="font-inter-medium text-[13px]" style={{ color: primaryColor }}>Prev</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        activeOpacity={0.7}
                        style={{
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: primaryColor,
                          backgroundColor:
                            currentPage === totalPages ? "rgba(13,27,42,0.05)" : "#FFFFFF",
                          opacity: currentPage === totalPages ? 0.4 : 1,
                        }}
                        className="px-3 py-2 items-center justify-center"
                      >
                        <Text className="font-inter-medium text-[13px]" style={{ color: primaryColor }}>Next</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
