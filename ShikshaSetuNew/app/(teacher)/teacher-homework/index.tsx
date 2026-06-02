import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Animated Skeleton Loader ────────────────────────────────────────────────
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

function HomeworkSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4 space-y-4">
      <SkeletonBox height={120} borderRadius={16} />
      <SkeletonBox height={120} borderRadius={16} />
      <SkeletonBox height={120} borderRadius={16} />
    </View>
  );
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface HomeworkListItem {
  id: string;
  title: string;
  due_date: string;
  status: string;
  total_marks: number | null;
  created_at: string;
  class: {
    id: string;
    name: string;
  } | null;
  section: {
    id: string;
    name: string;
  } | null;
  subject: {
    id: string;
    name: string;
  } | null;
  generated_content?: any;
  question_config?: any;
}

export default function HomeworkDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, isLoaded, isSignedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [homeworks, setHomeworks] = useState<HomeworkListItem[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchHomeworkData();
    }
  }, [isLoaded, isSignedIn, userId]);

  const fetchHomeworkData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch teacher record using auth userId
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error fetching teacher profile:", teacherErr);
        setError("Could not retrieve teacher profile.");
        setLoading(false);
        return;
      }

      const teacherId = teacherData.id;

      // 2. Fetch homeworks for the teacher
      const { data: homeworksData, error: homeworksErr } = await supabase
        .from("homework")
        .select(`
          id,
          title,
          due_date,
          status,
          total_marks,
          created_at,
          generated_content,
          question_config,
          class:classes (
            id,
            name
          ),
          section:sections (
            id,
            name
          ),
          subject:subjects (
            id,
            name
          )
        `)
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (homeworksErr) {
        console.error("Error fetching homeworks:", homeworksErr);
        setError("Failed to fetch homework assignments.");
        setLoading(false);
        return;
      }

      // Convert join data array cases to single object for typescript helper
      const formattedHomeworks: HomeworkListItem[] = (homeworksData || []).map((hw: any) => {
        const classObj = Array.isArray(hw.class) ? hw.class[0] : hw.class;
        const sectionObj = Array.isArray(hw.section) ? hw.section[0] : hw.section;
        const subjectObj = Array.isArray(hw.subject) ? hw.subject[0] : hw.subject;
        return {
          id: hw.id,
          title: hw.title,
          due_date: hw.due_date,
          status: hw.status || "active",
          total_marks: hw.total_marks ? Number(hw.total_marks) : null,
          created_at: hw.created_at,
          class: classObj ? { id: classObj.id, name: classObj.name } : null,
          section: sectionObj ? { id: sectionObj.id, name: sectionObj.name } : null,
          subject: subjectObj ? { id: subjectObj.id, name: subjectObj.name } : null,
          generated_content: hw.generated_content,
          question_config: hw.question_config,
        };
      });

      // 3. Fetch all active student enrollments to aggregate counts per section
      const { data: enrollmentData, error: enrollmentErr } = await supabase
        .from("enrollments")
        .select(`
          id,
          section_id
        `)
        .eq("is_active", true);

      if (enrollmentErr) {
        console.warn("Could not fetch active student enrollments counts:", enrollmentErr);
      } else {
        const counts: Record<string, number> = {};
        enrollmentData?.forEach((enroll: any) => {
          const sectionId = enroll.section_id;
          if (sectionId) {
            counts[sectionId] = (counts[sectionId] || 0) + 1;
          }
        });
        setStudentCounts(counts);
      }

      setHomeworks(formattedHomeworks);
      setLoading(false);
    } catch (err) {
      console.error("Unexpected error in fetchHomeworkData:", err);
      setError("An unexpected error occurred while loading assignments.");
      setLoading(false);
    }
  };

  // Format grade title: e.g. "Class 10" -> "Grade 10"
  const formatGradeName = (name: string) => {
    if (!name) return "";
    return name.includes("Class") ? name.replace("Class", "Grade") : name;
  };

  const getQuestionCount = (item: HomeworkListItem) => {
    try {
      if (item.generated_content) {
        const content = typeof item.generated_content === "string"
          ? JSON.parse(item.generated_content)
          : item.generated_content;
        if (content && content.questions && Array.isArray(content.questions)) {
          return content.questions.length;
        }
        if (content && content.metadata && content.metadata.total_questions) {
          return Number(content.metadata.total_questions);
        }
      }
      if (item.question_config) {
        const config = typeof item.question_config === "string"
          ? JSON.parse(item.question_config)
          : item.question_config;
        if (config) {
          const sum = Object.values(config).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
          if (sum > 0) return sum;
        }
      }
    } catch (e) {
      console.warn("Failed to parse question count:", e);
    }
    // Dynamic estimate based on total marks, with 5 as a safe default
    return Math.max(5, Math.floor(Number(item.total_marks || 50) / 10));
  };

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      <Header title="Homework" showBack={false} />

      {loading ? (
        <HomeworkSkeleton />
      ) : error ? (
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle" size={48} color="#DC2626" />
          <Text className="font-poppins-semibold text-lg text-[#0D1B2A] text-center mt-3">
            Error Loading Data
          </Text>
          <Text className="font-inter text-gray-500 text-center mt-1">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchHomeworkData}
            activeOpacity={0.7}
            className="mt-4 px-6 py-2.5 bg-[#0D1B2A] rounded-lg"
          >
            <Text className="font-poppins-semibold text-xs text-white">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : homeworks.length === 0 ? (
        // Empty State
        <View className="flex-1 justify-center items-center p-6">
          <View className="w-24 h-24 rounded-full bg-[#FFFFFF] shadow-sm items-center justify-center mb-4 border border-gray-50">
            <Feather name="clipboard" size={48} color="#D4AF37" />
          </View>
          <Text className="font-poppins-semibold text-lg text-[#0D1B2A]">
            No assignments yet
          </Text>
          <Text className="font-inter text-sm text-gray-400 mt-1">
            Create your first one!
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="font-poppins-semibold text-base text-[#0D1B2A] mb-4">
            Active Assignments
          </Text>

          <View className="space-y-4">
            {homeworks.map((item) => {
              const gradeName = item.class ? formatGradeName(item.class.name) : "Grade X";
              const sectionName = item.section ? item.section.name : "";
              const grade = sectionName ? `${gradeName} - ${sectionName}` : gradeName;
              const subjectName = item.subject?.name || "Subject";
              const questions = getQuestionCount(item);
              const students = item.section ? (studentCounts[item.section.id] || 0) : 0;
              
              // Format Due Date
              const dueDateObj = new Date(item.due_date);
              const formattedDate = dueDateObj.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              // Status Pill configuration
              const isExpired = item.status === "archived" || new Date(item.due_date) < new Date();
              const pillLabel = isExpired ? "EXPIRED" : "ACTIVE";

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/(teacher)/teacher-homework/${item.id}` as any)}
                  activeOpacity={0.85}
                  className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  {/* Top row with Subject & Status Pill */}
                  <View className="flex-row justify-between items-start">
                    <Text
                      style={{
                        fontFamily: "OpenSans_700Bold",
                        fontSize: 11,
                        fontWeight: "700",
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: "#D4AF37",
                        marginBottom: 4,
                      }}
                    >
                      {subjectName}
                    </Text>
                    <View
                      style={{
                        backgroundColor: isExpired ? "#F3F4F6" : "#DCFCE7",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 9999,
                      }}
                    >
                      <Text
                        style={{
                          color: isExpired ? "#6B7280" : "#16A34A",
                          fontSize: 11,
                          fontWeight: "700",
                          fontFamily: "OpenSans_700Bold",
                        }}
                      >
                        {pillLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Homework Title (Main Heading) */}
                  <Text className="font-poppins-semibold text-[16px] text-[#0D1B2A] mt-1.5">
                    {item.title}
                  </Text>
                  
                  {/* Class — Subject (Small Subtitle) */}
                  <Text className="font-inter text-gray-500 text-[12px] mt-1">
                    {grade} — {subjectName}
                  </Text>

                  {/* Metrics Row */}
                  <View className="flex-row items-center space-x-6 mt-4 pt-3 border-t border-gray-50">
                    <View className="flex-row items-center">
                      <Feather name="file-text" size={14} color="#6B7280" />
                      <Text className="font-inter text-gray-500 text-xs ml-1.5">
                        {questions} Questions
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Feather name="users" size={14} color="#6B7280" />
                      <Text className="font-inter text-gray-500 text-xs ml-1.5">
                        {students} Students
                      </Text>
                    </View>
                  </View>

                  {/* Due Date Row */}
                  <View className="flex-row items-center mt-2.5">
                    <Feather name="calendar" size={14} color="#6B7280" />
                    <Text className="font-inter text-gray-400 text-[11px] ml-1.5">
                      Due: {formattedDate}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        onPress={() => router.push("/(teacher)/teacher-homework/create" as any)}
        activeOpacity={0.85}
        className="absolute rounded-full bg-[#0D1B2A] items-center justify-center shadow-lg"
        style={{
          width: 56,
          height: 56,
          bottom: 60 + insets.bottom + 16,
          right: 16,
          shadowColor: "#0D1B2A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Feather name="plus" size={24} color="#D4AF37" />
      </TouchableOpacity>
    </View>
  );
}
