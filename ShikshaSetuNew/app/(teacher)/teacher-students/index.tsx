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
  const { userId, isLoaded, isSignedIn } = useAuth();

  // Loading and Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Teacher Profile Data
  const [teacher, setTeacher] = useState<any>(null);

  // Timetable raw result stored in state
  const [timetableData, setTimetableData] = useState<any[] | null>(null);

  // Selected class state
  const [selectedClass, setSelectedClass] = useState<ClassSectionItem | null>(null);

  // Memoized classes array
  const classes = useMemo(() => {
    if (!timetableData) return [];
    const seen = new Set();
    const mapped = timetableData.filter(row => {
      const key = row.section_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(row => {
      const sec = Array.isArray(row.section) ? row.section[0] : row.section;
      const cls = sec ? (Array.isArray(sec.class) ? sec.class[0] : sec.class) : null;
      return {
        class_id: cls?.id || "",
        class_name: cls?.name || "",
        section_id: row.section_id,
        section_name: sec?.name || "",
        label: `${cls?.name || ""}-${sec?.name || ""}`
      };
    });

    // Sort by class name, then section name
    return mapped.sort((a, b) => {
      if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
      return a.section_name.localeCompare(b.section_name);
    });
  }, [timetableData]);

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
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error fetching teacher:", teacherErr);
        setError("Could not load teacher profile");
        setLoading(false);
        return;
      }

      setTeacher(teacherData);
      const teacherUserId = teacherData.user_id;

      // 2. Fetch distinct classes & sections taught by teacher from timetable table
      const { data: timetableDataRes, error: timetableErr } = await supabase
        .from("timetable")
        .select(`
          section_id,
          section:sections!inner (
            id,
            name,
            class:classes!inner (
              id,
              name
            )
          ),
          class_subjects:class_subjects!inner (
            teacher_id
          )
        `);

      if (timetableErr) {
        console.error("Error fetching timetable:", timetableErr);
        setError("Could not load assigned classes");
        setLoading(false);
        return;
      }

      // Filter rows taught by this teacher (using teacherUserId which matches users.id)
      const teacherRows = (timetableDataRes || []).filter((row: any) => {
        const cs = Array.isArray(row.class_subjects) ? row.class_subjects[0] : row.class_subjects;
        return cs && cs.teacher_id === teacherUserId;
      });

      setTimetableData(teacherRows);

      // Extract unique classes for initial selection
      const seen = new Set();
      const uniqueClasses = teacherRows.filter(row => {
        const key = row.section_id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).map(row => {
        const sec = Array.isArray(row.section) ? row.section[0] : row.section;
        const cls = sec ? (Array.isArray(sec.class) ? sec.class[0] : sec.class) : null;
        return {
          class_id: cls?.id || "",
          class_name: cls?.name || "",
          section_id: row.section_id,
          section_name: sec?.name || "",
          label: `${cls?.name || ""}-${sec?.name || ""}`
        };
      }).sort((a, b) => {
        if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
        return a.section_name.localeCompare(b.section_name);
      });

      if (uniqueClasses.length > 0) {
        setSelectedClass(uniqueClasses[0]);
      } else {
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

      // ─── Query 1: Fetch Exams for Class Average ───
      const { data: examsData, error: examsErr } = await supabase
        .from("exams")
        .select("id, total_marks, exam_date")
        .eq("class_id", tab.class_id)
        .order("exam_date", { ascending: true }); // chronological

      if (examsErr) console.error("Error fetching exams:", examsErr);

      const examIds = examsData?.map((e) => e.id) || [];
      let examResultsData: any[] = [];

      if (examIds.length > 0) {
        const { data: erData, error: erErr } = await supabase
          .from("exam_results")
          .select("marks_obtained, exam_id, student_id")
          .in("exam_id", examIds);

        if (erErr) console.error("Error fetching exam results:", erErr);
        examResultsData = erData || [];
      }

      // Calculate class average
      let totalObtained = 0;
      let totalMaxMarks = 0;
      examResultsData.forEach((r: any) => {
        const ex = examsData?.find((e) => e.id === r.exam_id);
        if (r.marks_obtained !== null && ex) {
          totalObtained += Number(r.marks_obtained);
          totalMaxMarks += Number(ex.total_marks || 100);
        }
      });
      const avgMarksPct =
        totalMaxMarks > 0 ? ((totalObtained / totalMaxMarks) * 100).toFixed(1) + "%" : "—";
      setClassAvg(avgMarksPct);

      // ─── Query 2: Fetch enrolled students for selected section ───
      const { data: enrollmentsData, error: enrollmentsErr } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          roll_number,
          student:students!inner (
            id,
            student_code,
            user:users!inner (
              id,
              full_name,
              avatar_url:profile_photo_url
            )
          )
        `)
        .eq("section_id", tab.section_id)
        .eq("is_active", true);

      if (enrollmentsErr) {
        console.error("Error fetching enrollments:", enrollmentsErr);
        setError("Could not load student list");
        setLoading(false);
        return;
      }

      const sIds = enrollmentsData?.map((e) => e.student_id) || [];

      // ─── Query 3: Fetch AI Scores for Stats & Badges ───
      let dbAiScores: Record<string, number> = {};
      let totalAiSum = 0;
      let aiCount = 0;

      if (sIds.length > 0) {
        const { data: aiScoresData, error: aiScoresErr } = await supabase
          .from("ai_scores")
          .select("student_id, score, date")
          .in("student_id", sIds)
          .order("date", { ascending: false });

        if (aiScoresErr) console.error("Error fetching AI scores:", aiScoresErr);

        aiScoresData?.forEach((s) => {
          // Keep only latest score per student for display
          if (dbAiScores[s.student_id] === undefined) {
            const rawScore = Number(s.score);
            const scoreVal = rawScore > 10 ? rawScore / 10 : rawScore;
            dbAiScores[s.student_id] = scoreVal;
          }
          // Cumulative calculation for section stats
          const cumulativeScore = Number(s.score);
          totalAiSum += cumulativeScore > 10 ? cumulativeScore / 10 : cumulativeScore;
          aiCount++;
        });
      }
      const avgAiTalent = aiCount > 0 ? (totalAiSum / aiCount).toFixed(1) + "/10" : "—";
      setAiTalentScore(avgAiTalent);

      // ─── Query 4: Fetch Student Attendance for stats ───
      let avgAtt = "—";
      if (sIds.length > 0) {
        const { data: attendanceData, error: attErr } = await supabase
          .from("student_attendance")
          .select("status")
          .in("student_id", sIds);

        if (attErr) console.error("Error fetching attendance:", attErr);

        if (attendanceData && attendanceData.length > 0) {
          let presentCount = 0;
          attendanceData.forEach((att) => {
            if (att.status === "present" || att.status === "late") {
              presentCount++;
            }
          });
          avgAtt = Math.round((presentCount / attendanceData.length) * 100) + "%";
        }
      }
      setAttendanceRate(avgAtt);

      // ─── Processing: Students Table Mapping, Marks Avg, and Trends ───
      const mappedStudents: StudentItem[] = (enrollmentsData || []).map((e: any) => {
        const studentObj = Array.isArray(e.student) ? e.student[0] : e.student;
        const userObj = studentObj
          ? Array.isArray(studentObj.user)
            ? studentObj.user[0]
            : studentObj.user
          : null;

        const sid = studentObj?.id;

        // Filter exam results for this student
        const sResults = examResultsData.filter(
          (r) => r.student_id === sid && r.marks_obtained !== null
        );

        let studentObtained = 0;
        let studentMax = 0;
        sResults.forEach((r) => {
          const ex = examsData?.find((e) => e.id === r.exam_id);
          if (ex) {
            studentObtained += Number(r.marks_obtained);
            studentMax += Number(ex.total_marks || 100);
          }
        });
        const marksPct = studentMax > 0 ? Math.round((studentObtained / studentMax) * 100) : null;

        // Fetch student's latest AI score
        const aiScore = dbAiScores[sid] !== undefined ? dbAiScores[sid] : null;

        // Calculate trend (Compare last 2 exam scores)
        const sortedStudentResults = sResults
          .map((r) => {
            const ex = examsData?.find((e) => e.id === r.exam_id);
            return {
              ...r,
              exam_date: ex ? new Date(ex.exam_date) : new Date(0),
              total_marks: ex ? Number(ex.total_marks || 100) : 100,
            };
          })
          .sort((a, b) => a.exam_date.getTime() - b.exam_date.getTime()); // oldest first

        let trend: "improving" | "declining" | "stable" = "stable";
        if (sortedStudentResults.length >= 2) {
          const latest = sortedStudentResults[sortedStudentResults.length - 1];
          const prev = sortedStudentResults[sortedStudentResults.length - 2];

          const latestPct = (Number(latest.marks_obtained) / latest.total_marks) * 100;
          const prevPct = (Number(prev.marks_obtained) / prev.total_marks) * 100;

          if (latestPct > prevPct) trend = "improving";
          else if (latestPct < prevPct) trend = "declining";
        }

        return {
          id: sid,
          roll_number: e.roll_number,
          student_code: studentObj?.student_code || "",
          full_name: userObj?.full_name || "Unknown Student",
          avatar_url: userObj?.avatar_url || null,
          marks: marksPct,
          ai_score: aiScore,
          trend,
        };
      });

      // Sort by marks % descending (students with highest scores at top)
      mappedStudents.sort((a, b) => {
        if (a.marks === null && b.marks === null) return 0;
        if (a.marks === null) return 1; // move nulls to end
        if (b.marks === null) return -1;
        return b.marks - a.marks; // desc
      });

      setStudents(mappedStudents);
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
          <Text className="font-poppins-bold text-[13px] text-[#0D1B2A]">—</Text>
        </View>
      );
    }

    let bg = "bg-[#F0EDED]";
    let text = "text-[#0D1B2A]";

    if (score >= 8.0) {
      bg = "bg-[#D4AF37]"; // Gold
      text = "text-[#0D1B2A]";
    } else if (score < 6.0) {
      bg = "bg-[#FFE0E0]"; // Red bg
      text = "text-[#DC2626]";
    }

    return (
      <View style={{ borderRadius: 6 }} className={`${bg} px-2.5 py-1 items-center justify-center min-w-[40px]`}>
        <Text className={`font-poppins-bold text-[13px] ${text}`}>
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
    <View className="flex-1 bg-[#F7F3EB]">
      {/* Header */}
      <Header title="Students" showBack={false} />

      {/* Tabs / Loading / List View */}
      {loading && classes.length === 0 ? (
        <StudentListSkeleton />
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
                        backgroundColor: isSelected ? "#D4AF37" : "#FFFFFF",
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: "#0D1B2A",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#0D1B2A",
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
                        color: "#D4AF37",
                        letterSpacing: 0.5,
                      }}
                    >
                      CLASS AVERAGE
                    </Text>
                    <Ionicons name="star" size={16} color="#D4AF37" />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#0D1B2A",
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
                        color: "#D4AF37",
                        letterSpacing: 0.5,
                      }}
                    >
                      AI TALENT SCORE
                    </Text>
                    <Ionicons name="bulb" size={16} color="#D4AF37" />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#0D1B2A",
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
                        color: "#D4AF37",
                        letterSpacing: 0.5,
                      }}
                    >
                      ATTENDANCE
                    </Text>
                    <Ionicons name="checkbox" size={16} color="#D4AF37" />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#0D1B2A",
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
                    <Ionicons name="people-outline" size={48} color="#D4AF37" />
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
                            <View className="w-10 h-10 rounded-full bg-[#0D1B2A] items-center justify-center border border-gray-200">
                              <Text className="font-poppins-bold text-[16px] text-[#D4AF37]">
                                {getInitials(student.full_name)}
                              </Text>
                            </View>
                          )}

                          <View className="flex-1 pr-1">
                            <Text
                              className="font-inter-semibold text-sm text-[#0D1B2A] leading-tight"
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
                          <Text className="font-inter-bold text-[15px] text-[#0D1B2A] text-right">
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
                          borderColor: "#0D1B2A",
                          backgroundColor: currentPage === 1 ? "rgba(13,27,42,0.05)" : "#FFFFFF",
                          opacity: currentPage === 1 ? 0.4 : 1,
                        }}
                        className="px-3 py-2 items-center justify-center"
                      >
                        <Text className="font-inter-medium text-[13px] text-[#0D1B2A]">Prev</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        activeOpacity={0.7}
                        style={{
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#0D1B2A",
                          backgroundColor:
                            currentPage === totalPages ? "rgba(13,27,42,0.05)" : "#FFFFFF",
                          opacity: currentPage === totalPages ? 0.4 : 1,
                        }}
                        className="px-3 py-2 items-center justify-center"
                      >
                        <Text className="font-inter-medium text-[13px] text-[#0D1B2A]">Next</Text>
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
