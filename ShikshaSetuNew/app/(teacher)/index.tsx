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
  const { userId, isLoaded, isSignedIn } = useAuth();

  // State Management
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<any>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("All");

  // Stats
  const [avgMarks, setAvgMarks] = useState<number | null>(null);
  const [avgAiScore, setAvgAiScore] = useState<number>(7.8);
  const [pendingHomeworkCount, setPendingHomeworkCount] = useState<number>(0);
  const [homeworkDueString, setHomeworkDueString] = useState<string>("No active homeworks");
  const [topStudents, setTopStudents] = useState<StudentPerformance[]>([]);

  // Fetch Dashboard Data
  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      loadDashboard();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // 1. Fetch teacher record using auth userId
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select(`
          id,
          user_id,
          employee_code,
          specialization,
          user:users!inner (
            full_name,
            profile_photo_url
          )
        `)
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error fetching teacher profile:", teacherErr);
        setLoading(false);
        return;
      }

      const teacherObj = teacherData as any;
      const userDetails = Array.isArray(teacherObj.user) ? teacherObj.user[0] : teacherObj.user;
      const teacherProfile = {
        id: teacherObj.id,
        user_id: teacherObj.user_id,
        employee_code: teacherObj.employee_code,
        specialization: teacherObj.specialization,
        name: userDetails?.full_name || "Teacher",
        profile_photo_url: userDetails?.profile_photo_url,
      };

      setTeacher(teacherProfile);
      const teacherId = teacherProfile.id;
      const teacherUserId = teacherProfile.user_id;

      // 2. Fetch distinct subjects from timetable joined with subjects (with fallback)
      let timetableData: any[] = [];
      let timetableError: any = null;

      try {
        const { data, error } = await supabase
          .from("timetable")
          .select(`
            class_subjects!inner (
              subject_id,
              teacher_id,
              subject:subjects (
                id,
                name
              )
            )
          `);

        timetableData = data || [];
        timetableError = error;
      } catch (e) {
        timetableError = e;
      }

      // If the direct schema check failed or returned error, fallback to class_subjects directly
      if (timetableError || timetableData.length === 0) {
        const { data: fallbackData } = await supabase
          .from("class_subjects")
          .select(`
            subject_id,
            teacher_id,
            subject:subjects (
              id,
              name
            )
          `)
          .or(`teacher_id.eq.${teacherId},teacher_id.eq.${teacherUserId}`);
        
        if (fallbackData) {
          timetableData = fallbackData.map(fd => ({
            class_subjects: fd
          }));
        }
      }

      // Extract unique subjects
      const subjectsMap = new Map<string, string>();
      timetableData.forEach((row: any) => {
        const cs = Array.isArray(row.class_subjects) ? row.class_subjects[0] : row.class_subjects;
        if (cs && (cs.teacher_id === teacherId || cs.teacher_id === teacherUserId)) {
          const sub = Array.isArray(cs.subject) ? cs.subject[0] : cs.subject;
          if (sub) {
            subjectsMap.set(sub.id, sub.name);
          }
        }
      });

      const uniqueSubjects: SubjectItem[] = Array.from(subjectsMap.entries()).map(([id, name]) => ({
        id,
        name,
      }));
      setSubjects(uniqueSubjects);

      // 3. Find taught sections to query students
      let sectionIds: string[] = [];
      const { data: sectionTimetables } = await supabase
        .from("timetable")
        .select(`
          section_id,
          class_subjects!inner (
            teacher_id
          )
        `);

      if (sectionTimetables) {
        sectionTimetables.forEach((row: any) => {
          const cs = Array.isArray(row.class_subjects) ? row.class_subjects[0] : row.class_subjects;
          if (cs && (cs.teacher_id === teacherId || cs.teacher_id === teacherUserId)) {
            sectionIds.push(row.section_id);
          }
        });
      }

      // Fallback sections
      if (sectionIds.length === 0) {
        const { data: csData } = await supabase
          .from("class_subjects")
          .select("section_id")
          .or(`teacher_id.eq.${teacherId},teacher_id.eq.${teacherUserId}`);
        
        if (csData) {
          sectionIds = csData.map(c => c.section_id).filter(Boolean);
        }
      }

      sectionIds = Array.from(new Set(sectionIds));

      // 4. Fetch students in taught sections
      let enrolledStudentIds: string[] = [];
      let studentsList: any[] = [];

      if (sectionIds.length > 0) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select(`
            student_id,
            student:students!inner (
              id,
              user:users!inner (
                full_name,
                avatar_url:profile_photo_url,
                email,
                phone
              )
            )
          `)
          .in("section_id", sectionIds)
          .eq("is_active", true);

        if (enrollments) {
          enrolledStudentIds = enrollments.map(e => e.student_id);
          studentsList = enrollments.map((e: any) => {
            const studentObj = Array.isArray(e.student) ? e.student[0] : e.student;
            const userObj = studentObj ? (Array.isArray(studentObj.user) ? studentObj.user[0] : studentObj.user) : null;
            return {
              student_id: e.student_id,
              name: userObj?.full_name || userObj?.email || userObj?.phone || "",
              profile_photo_url: userObj?.avatar_url || userObj?.profile_photo_url || null,
            };
          });
        }
      }

      // 5. Query homework details
      const { data: homeworks } = await supabase
        .from("homework")
        .select("id, title, due_date, status")
        .eq("teacher_id", teacherId)
        .eq("status", "active")
        .order("due_date", { ascending: true });

      setPendingHomeworkCount(homeworks?.length || 0);

      const closestHw = homeworks && homeworks.length > 0 ? homeworks[0] : null;
      if (closestHw) {
        const now = dayjs();
        const dueTime = dayjs(closestHw.due_date);
        const diffHours = dueTime.diff(now, "hour");
        const diffMinutes = dueTime.diff(now, "minute");

        if (diffMinutes < 0) {
          setHomeworkDueString("⏰ Overdue");
        } else if (diffHours < 1) {
          setHomeworkDueString(`⏰ Due in ${diffMinutes} minutes`);
        } else if (diffHours <= 24) {
          setHomeworkDueString(`⏰ Due in ${diffHours} hours`);
        } else {
          const diffDays = dueTime.diff(now, "day");
          setHomeworkDueString(`⏰ Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`);
        }
      } else {
        setHomeworkDueString("⏰ No active homeworks");
      }

      // 6. Query AI Scores (for AI score gauge)
      if (enrolledStudentIds.length > 0) {
        const { data: aiScores } = await supabase
          .from("ai_scores")
          .select("score")
          .in("student_id", enrolledStudentIds);

        if (aiScores && aiScores.length > 0) {
          const totalAi = aiScores.reduce((acc, curr) => acc + Number(curr.score), 0);
          const rawAvg = totalAi / aiScores.length;
          // Scale from 100 to 10 if necessary, assuming scores are e.g. 0-10 or 0-100
          const scaledAvg = rawAvg > 10 ? rawAvg / 10 : rawAvg;
          setAvgAiScore(Number(scaledAvg.toFixed(1)));
        } else {
          setAvgAiScore(7.8); // Default fallback
        }
      }

      // 7. Query Exams & Exam Results (Safe check for table presence)
      let examResultsData: any[] = [];
      let examsTableMissing = false;

      try {
        const { data: examResults, error: examResultsErr } = await supabase
          .from("exam_results")
          .select(`
            student_id,
            marks_obtained,
            exam:exams!inner (
              id,
              total_marks,
              subject_id,
              subject:subjects (
                name
              )
            )
          `);

        if (examResultsErr) {
          if (examResultsErr.code === "42P01") {
            examsTableMissing = true;
          } else {
            console.error("Exam results fetch error:", examResultsErr);
          }
        } else {
          examResultsData = examResults || [];
        }
      } catch (e: any) {
        if (e?.code === "42P01" || String(e?.message).includes("does not exist")) {
          examsTableMissing = true;
        }
      }

      if (examsTableMissing) {
        // TODO: exam_results table does not exist
        setAvgMarks(null);
        setTopStudents([]);
      } else {
        // Compute statistics for the average marks card
        let totalObtained = 0;
        let totalMax = 0;

        examResultsData.forEach((er: any) => {
          const exam = Array.isArray(er.exam) ? er.exam[0] : er.exam;
          if (exam && er.marks_obtained !== null) {
            totalObtained += Number(er.marks_obtained);
            totalMax += Number(exam.total_marks || 100);
          }
        });

        const calculatedAvg = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;
        setAvgMarks(calculatedAvg);

        // Calculate top students list
        if (studentsList.length > 0 && examResultsData.length > 0) {
          const scoredStudents = studentsList.map(student => {
            const studentResults = examResultsData.filter(r => r.student_id === student.student_id);

            let sObtained = 0;
            let sMax = 0;
            let subName = "—";

            studentResults.forEach((r: any) => {
              const exam = Array.isArray(r.exam) ? r.exam[0] : r.exam;
              if (exam && r.marks_obtained !== null) {
                sObtained += Number(r.marks_obtained);
                sMax += Number(exam.total_marks || 100);
                const subObj = Array.isArray(exam.subject) ? exam.subject[0] : exam.subject;
                if (subObj) subName = subObj.name;
              }
            });

            const scorePct = sMax > 0 ? Math.round((sObtained / sMax) * 100) : null;
            return {
              ...student,
              score: scorePct,
              subject: scorePct !== null ? subName : "—",
            };
          });

          const sortedTop = scoredStudents
            .sort((a, b) => {
              if (a.score === null && b.score === null) return 0;
              if (a.score === null) return 1;
              if (b.score === null) return -1;
              return b.score - a.score;
            })
            .slice(0, 5);

          setTopStudents(sortedTop);
        }
      }

      // Fallback top students if empty
      if (topStudents.length === 0 && studentsList.length > 0) {
        setTopStudents(
          studentsList.slice(0, 5).map(s => ({
            student_id: s.student_id,
            name: s.name,
            profile_photo_url: s.profile_photo_url,
            score: null,
            subject: "—",
          }))
        );
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setLoading(false);
    }
  };

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

      {loading ? (
        <DashboardSkeleton />
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
