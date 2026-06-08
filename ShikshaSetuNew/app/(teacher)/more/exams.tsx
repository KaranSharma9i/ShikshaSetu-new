import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";
import dayjs from "dayjs";

// ─── Custom Skeleton Loader ───────────────────
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

function ExamsSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4 space-y-4">
      <SkeletonBox width={120} height={18} style={{ marginBottom: 4 }} />
      <SkeletonBox height={72} borderRadius={12} />
      <SkeletonBox height={72} borderRadius={12} />
      <SkeletonBox width={120} height={18} style={{ marginTop: 12, marginBottom: 4 }} />
      <SkeletonBox height={72} borderRadius={12} />
    </View>
  );
}

interface ExamItem {
  id: string;
  exam_name: string;
  exam_type: string | null;
  exam_date: string;
  total_marks: number | null;
  class_name: string;
  subject_name: string;
}

export default function ExamScheduleScreen() {
  const router = useRouter();
  const { userId, isLoaded, isSignedIn, theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const creamColor = theme?.colors?.cream ?? "#F7F3EB";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingExams, setUpcomingExams] = useState<ExamItem[]>([]);
  const [pastExams, setPastExams] = useState<ExamItem[]>([]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      loadExams();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch teacher record
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error loading teacher:", teacherErr);
        setError("Could not load teacher profile");
        setLoading(false);
        return;
      }

      // 2. Fetch distinct classes taught by teacher from timetable
      const { data: timetableData, error: timetableErr } = await supabase
        .from("timetable")
        .select(`
          section:sections!inner (
            class_id
          ),
          class_subjects:class_subjects!inner (
            teacher_id
          )
        `);

      if (timetableErr) {
        console.error("Error loading classes from timetable:", timetableErr);
        setError("Failed to fetch classes details");
        setLoading(false);
        return;
      }

      // Filter and map distinct class IDs
      const teacherUserId = teacherData.user_id;
      const classIdsSet = new Set<string>();
      timetableData?.forEach((row: any) => {
        const cs = Array.isArray(row.class_subjects)
          ? row.class_subjects[0]
          : row.class_subjects;
        if (cs && cs.teacher_id === teacherUserId) {
          const sec = Array.isArray(row.section) ? row.section[0] : row.section;
          if (sec && sec.class_id) {
            classIdsSet.add(sec.class_id);
          }
        }
      });

      const classIds = Array.from(classIdsSet);

      if (classIds.length === 0) {
        setUpcomingExams([]);
        setPastExams([]);
        setLoading(false);
        return;
      }

      // 3. Fetch exams matching classIds
      const { data: examsData, error: examsErr } = await supabase
        .from("exams")
        .select(`
          id,
          exam_name,
          exam_type,
          exam_date,
          total_marks,
          class:classes!inner (
            id,
            name
          ),
          subject:subjects!inner (
            id,
            name
          )
        `)
        .in("class_id", classIds)
        .order("exam_date", { ascending: true });

      if (examsErr) {
        console.error("Error fetching exams:", examsErr);
        setError("Failed to fetch exam schedules");
        setLoading(false);
        return;
      }

      // Process and separate exams
      const today = dayjs().startOf("day");
      const mappedExams: ExamItem[] = (examsData || []).map((exam: any) => {
        const clsObj = Array.isArray(exam.class) ? exam.class[0] : exam.class;
        const subObj = Array.isArray(exam.subject) ? exam.subject[0] : exam.subject;

        return {
          id: exam.id,
          exam_name: exam.exam_name,
          exam_type: exam.exam_type,
          exam_date: exam.exam_date,
          total_marks: exam.total_marks ? Number(exam.total_marks) : null,
          class_name: clsObj?.name || "Unknown Class",
          subject_name: subObj?.name || "Unknown Subject",
        };
      });

      const upcoming = mappedExams.filter((e) => !dayjs(e.exam_date).isBefore(today));
      const past = mappedExams.filter((e) => dayjs(e.exam_date).isBefore(today)).reverse(); // latest past first

      setUpcomingExams(upcoming);
      setPastExams(past);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load exams:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const renderExamCard = (item: ExamItem, isPast: boolean) => {
    const day = dayjs(item.exam_date).format("DD");
    const month = dayjs(item.exam_date).format("MMM").toUpperCase();

    return (
      <View
        key={item.id}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 12,
          shadowColor: "rgba(0,0,0,0.04)",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 2,
          opacity: isPast ? 0.7 : 1,
          flexDirection: "row",
          alignItems: "center",
        }}
        className="border border-gray-100 mb-3"
      >
        {/* Date block */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: isPast ? "#9CA3AF" : primaryColor,
            alignItems: "center",
            justifyContent: "center",
          }}
          className="mr-3"
        >
          <Text
            style={{ fontFamily: "Poppins-Bold" }}
            className="text-[18px] font-bold text-white leading-none"
          >
            {day}
          </Text>
          <Text
            style={{ fontFamily: "OpenSans" }}
            className="text-[9px] text-white/70 font-bold mt-0.5 leading-none"
          >
            {month}
          </Text>
        </View>

        {/* Content block */}
        <View className="flex-1 pr-2">
          <Text
            style={{ fontFamily: "Poppins-SemiBold", color: primaryColor }}
            className="text-[14px] font-bold leading-tight"
            numberOfLines={1}
          >
            {item.exam_name}
          </Text>

          <View className="flex-row flex-wrap items-center mt-1">
            <Text
              style={{ fontFamily: "Inter-Medium", color: secondaryColor }}
              className="text-[12px] font-semibold mr-3"
            >
              {item.class_name}
            </Text>
            <Text
              style={{ fontFamily: "Inter-Regular" }}
              className="text-[12px] text-[#44474C]"
            >
              {item.subject_name}
            </Text>
          </View>
        </View>

        {/* Max Marks */}
        {item.total_marks !== null && (
          <View className="items-end">
            <Text
              style={{ fontFamily: "OpenSans" }}
              className="text-[11px] text-gray-400 font-bold"
            >
              Max: {item.total_marks}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const hasExams = upcomingExams.length > 0 || pastExams.length > 0;

  return (
    <View style={{ backgroundColor: creamColor }} className="flex-1">
      <Header title="Exam Schedule" showBack={true} onBack={() => router.back()} />

      {loading ? (
        <ExamsSkeleton />
      ) : error ? (
        <View className="mx-4 mt-6 bg-red-50 p-4 rounded-xl border border-red-200 flex-row items-center justify-between">
          <Text className="font-inter text-red-700 text-sm flex-1 mr-2">{error}</Text>
          <TouchableOpacity
            onPress={() => loadExams()}
            className="bg-white border border-red-300 px-3 py-1.5 rounded-lg"
          >
            <Text className="font-inter-medium text-red-700 text-xs">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {!hasExams ? (
            <View className="items-center justify-center py-16">
              <Feather name="clipboard" size={48} color={secondaryColor} />
              <Text
                style={{ fontFamily: "Poppins-SemiBold", color: primaryColor }}
                className="text-sm font-bold mt-4"
              >
                No exams scheduled
              </Text>
            </View>
          ) : (
            <View>
              {/* Upcoming Exams Section */}
              {upcomingExams.length > 0 && (
                <View className="mb-6">
                  <Text
                    style={{
                      fontFamily: "OpenSans-Bold",
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 0.8,
                      color: secondaryColor,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Upcoming Exams
                  </Text>
                  {upcomingExams.map((item) => renderExamCard(item, false))}
                </View>
              )}

              {/* Past Exams Section */}
              {pastExams.length > 0 && (
                <View>
                  <Text
                    style={{
                      fontFamily: "OpenSans-Bold",
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 0.8,
                      color: "#44474C",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Past Exams
                  </Text>
                  {pastExams.map((item) => renderExamCard(item, true))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
