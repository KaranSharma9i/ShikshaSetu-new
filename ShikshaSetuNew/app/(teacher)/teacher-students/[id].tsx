import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Image,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import dayjs from "dayjs";
import {
  getTeacherProfileByUserId,
  getTeacherStudentProfile,
  getStudentRankInClass,
  getStudentAverageAiScore,
  getStudentAiEngagementScores,
  getStudentExamMarksForTeacher,
  getStudentHomeworkSubmissions,
  getTeacherClasses,
} from "@/src/repositories/teacherRepository";

// Screen Width
const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Opacity Pulse Skeleton Component ────────────────────────
function CardSkeleton({ height }: { height: number }) {
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
      style={{
        height,
        backgroundColor: "#E5E2DA",
        borderRadius: 16,
        opacity,
        marginBottom: 16,
        width: "100%",
      }}
    />
  );
}

// ─── Custom Dropdown Modal/List Component ───────────────────
interface SubjectDropdownProps {
  options: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function SubjectDropdown({ options, selectedId, onSelect }: SubjectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.id === selectedId);

  return (
    <View className="relative z-50">
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
        className="bg-white border border-[#E4E2E1] px-3 py-1.5 rounded-lg flex-row items-center space-x-1"
      >
        <Text className="font-inter-medium text-xs text-[#0D1B2A]">
          {selectedOption ? selectedOption.name : "Select Subject"}
        </Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#0D1B2A" />
      </TouchableOpacity>

      {isOpen && options.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#E4E2E1",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 5,
            minWidth: 140,
          }}
        >
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => {
                onSelect(opt.id);
                setIsOpen(false);
              }}
              className="px-3 py-2 border-b border-gray-100 last:border-b-0"
            >
              <Text className="font-inter text-xs text-[#0D1B2A]">{opt.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Smooth Cubic Bezier Path Builder for Line Chart ────────
const getBezierPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return path;
};

export default function StudentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { userId, isLoaded, isSignedIn } = useAuth();

  // Load state and sections
  const [profileLoading, setProfileLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [homeworkLoading, setHomeworkLoading] = useState(true);

  // Errors
  const [profileError, setProfileError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [homeworkError, setHomeworkError] = useState<string | null>(null);

  // Profile data
  const [student, setStudent] = useState<any>(null);
  const [rank, setRank] = useState<string>("—");
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [avgAiScore, setAvgAiScore] = useState<string>("—");

  // Chart & Dropdown data
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [examResults, setExamResults] = useState<any[]>([]);

  // Homework & recent submissions data
  const [homeworkTotal, setHomeworkTotal] = useState(0);
  const [homeworkSubmitted, setHomeworkSubmitted] = useState(0);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);

  // AI Engagement states
  const [aiEngagement, setAiEngagement] = useState<{
    conceptClarity: string;
    completeness: string;
    presentation: string;
  }>({ conceptClarity: "8.4", completeness: "7.2", presentation: "9.1" });

  // Individual marks editing modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalExams, setModalExams] = useState<any[]>([]);
  const [modalMarks, setModalMarks] = useState<Record<string, string>>({});
  const [initialModalMarks, setInitialModalMarks] = useState<Record<string, string>>({});

  const loadStudentExams = async () => {
    if (!student) return;
    try {
      setModalLoading(true);

      // Fetch exams for student's class
      const { data: examsData, error: examsErr } = await supabase
        .from("exams")
        .select(`
          id,
          exam_name,
          exam_date,
          total_marks,
          subject:subjects!inner (
            name
          )
        `)
        .eq("class_id", student.class_id)
        .order("exam_date", { ascending: false });

      if (examsErr) {
        console.error("Error loading exams for modal:", examsErr);
        setModalLoading(false);
        return;
      }

      // Fetch results for this student
      const { data: resultsData, error: resultsErr } = await supabase
        .from("exam_results")
        .select("exam_id, marks_obtained")
        .eq("student_id", student.id);

      if (resultsErr) {
        console.error("Error loading results for modal:", resultsErr);
        setModalLoading(false);
        return;
      }

      const resultsMap: Record<string, string> = {};
      resultsData?.forEach((res) => {
        if (res.marks_obtained !== null && res.marks_obtained !== undefined) {
          resultsMap[res.exam_id] = res.marks_obtained.toString();
        }
      });

      const processedExams = (examsData || []).map((exam: any) => {
        const sub = Array.isArray(exam.subject) ? exam.subject[0] : exam.subject;
        return {
          id: exam.id,
          exam_name: exam.exam_name,
          exam_date: exam.exam_date,
          total_marks: exam.total_marks ? Number(exam.total_marks) : 100,
          subject_name: sub?.name || "Unknown Subject",
          marks_obtained: resultsMap[exam.id] || "",
        };
      });

      setModalExams(processedExams);
      
      const initialMarks: Record<string, string> = {};
      processedExams.forEach((e) => {
        initialMarks[e.id] = e.marks_obtained;
      });
      setModalMarks(initialMarks);
      setInitialModalMarks({ ...initialMarks });
      setModalLoading(false);
    } catch (err) {
      console.error("Failed loading student exams:", err);
      setModalLoading(false);
    }
  };

  const handleModalMarkChange = (examId: string, val: string) => {
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;

    setModalMarks((prev) => ({
      ...prev,
      [examId]: val,
    }));
  };

  const isModalInputInvalid = (examId: string) => {
    const exam = modalExams.find((e) => e.id === examId);
    if (!exam) return false;
    const valStr = modalMarks[examId];
    if (!valStr || valStr.trim() === "") return false;
    const val = parseFloat(valStr);
    return isNaN(val) || val < 0 || val > exam.total_marks;
  };

  const hasAnyModalValidationErrors = () => {
    let invalid = false;
    modalExams.forEach((e) => {
      if (isModalInputInvalid(e.id)) invalid = true;
    });
    return invalid;
  };

  const hasModalChanges = () => {
    for (const e of modalExams) {
      const current = modalMarks[e.id] || "";
      const initial = initialModalMarks[e.id] || "";
      if (current.trim() !== initial.trim()) return true;
    }
    return false;
  };

  const saveStudentMarks = async () => {
    if (!student) return;

    if (hasAnyModalValidationErrors()) return;

    try {
      setModalLoading(true);

      const upsertData = modalExams
        .filter((e) => modalMarks[e.id] !== undefined && modalMarks[e.id].trim() !== "")
        .map((e) => ({
          exam_id: e.id,
          student_id: student.id,
          marks_obtained: parseFloat(modalMarks[e.id]),
        }));

      const deleteIds = modalExams
        .filter(
          (e) =>
            initialModalMarks[e.id] !== undefined &&
            (modalMarks[e.id] === undefined || modalMarks[e.id].trim() === "")
        )
        .map((e) => e.id);

      if (upsertData.length > 0) {
        const { error: upsertErr } = await supabase
          .from("exam_results")
          .upsert(upsertData, {
            onConflict: "exam_id,student_id",
          });
        if (upsertErr) throw upsertErr;
      }

      if (deleteIds.length > 0) {
        const { error: deleteErr } = await supabase
          .from("exam_results")
          .delete()
          .eq("student_id", student.id)
          .in("exam_id", deleteIds);
        if (deleteErr) throw deleteErr;
      }

      setModalVisible(false);
      // Refresh all statistics and chart data
      loadProfileAndRank();
    } catch (err) {
      console.error("Failed saving individual marks:", err);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && userId && id) {
      loadAllData();
    }
  }, [isLoaded, isSignedIn, userId, id]);

  const loadAllData = async () => {
    loadProfileAndRank();
  };

  // 1. Load Student Profile, Class Rank & general stats
  const loadProfileAndRank = async () => {
    try {
      setProfileLoading(true);
      setProfileError(null);

      // Fetch teacher info
      if (!userId) {
        setProfileError("Could not verify teacher profile");
        setProfileLoading(false);
        return;
      }
      const teacherData = await getTeacherProfileByUserId(userId);
      if (!teacherData) {
        setProfileError("Could not verify teacher profile");
        setProfileLoading(false);
        return;
      }

      // Fetch student profile, enrollment info, and user account details
      const profile = await getTeacherStudentProfile(id as string);
      if (!profile) {
        setProfileError("Could not load student profile");
        setProfileLoading(false);
        return;
      }

      const profileObj = {
        ...profile,
        teacher_id: teacherData.id,
      };

      setStudent(profileObj);

      // Compute rank in section & avg AI score in parallel
      computeCohortRank(profile.id, profile.class_id);
      loadAIScoreAvg(profile.id);
      loadHomeworkStats(profile.id, profile.class_id, teacherData.id);
      loadSubjectDropdownAndExams(profile.id, teacherData.id, profile.section_id);
      loadAiEngagement(profile.id);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setProfileError("Could not load profile");
      setProfileLoading(false);
    }
  };

  // Compute Rank in class section
  const computeCohortRank = async (studentId: string, classId: string) => {
    try {
      const res = await getStudentRankInClass(studentId, classId);
      setRank(res.rank);
      setTotalStudents(res.total);
    } catch (err) {
      console.error("Failed to compute cohort rank:", err);
      setRank("—");
      setTotalStudents(0);
    }
  };

  // Load average AI score from homework_submissions table
  const loadAIScoreAvg = async (studentId: string) => {
    try {
      const avg = await getStudentAverageAiScore(studentId);
      setAvgAiScore(avg);
    } catch (err) {
      console.error("Failed to load AI scores:", err);
      setAvgAiScore("—");
    }
  };

  // Load AI Engagement scores
  const loadAiEngagement = async (studentId: string) => {
    try {
      const scores = await getStudentAiEngagementScores(studentId);
      setAiEngagement(scores);
    } catch (err) {
      console.error("Failed to load AI engagement scores:", err);
    }
  };

  // Load subject dropdown and exam results
  const loadSubjectDropdownAndExams = async (
    studentId: string,
    teacherId: string,
    sectionId: string
  ) => {
    try {
      setChartLoading(true);
      setChartError(null);

      // Fetch teacher's subjects for this section using the getTeacherClasses repository function
      const teacherClasses = await getTeacherClasses(teacherId);
      const sectionSubjects = teacherClasses
        .filter((c) => c.section_id === sectionId)
        .map((c) => ({ id: c.subject_id, name: c.subject_name }));

      // Unique subjects
      const seen = new Set();
      const uniqueSectionSubjects = sectionSubjects.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      setSubjects(uniqueSectionSubjects);

      // Fetch exam results scoped to this teacher's subjects
      const results = await getStudentExamMarksForTeacher(studentId, teacherId);
      setExamResults(results);

      if (uniqueSectionSubjects.length > 0) {
        setSelectedSubjectId(uniqueSectionSubjects[0].id);
      }
      setChartLoading(false);
    } catch (err) {
      console.error("Failed to load chart data:", err);
      setChartError("Could not load chart data");
      setChartLoading(false);
    }
  };

  // Load homework stats and recent submissions table
  const loadHomeworkStats = async (studentId: string, classId: string, teacherId: string) => {
    try {
      setHomeworkLoading(true);
      setHomeworkError(null);

      const res = await getStudentHomeworkSubmissions(studentId, classId, teacherId);

      setHomeworkTotal(res.total);
      setHomeworkSubmitted(res.submitted);
      setRecentSubmissions(res.submissions);
      setHomeworkLoading(false);
    } catch (err) {
      console.error("Failed to load homework details:", err);
      setHomeworkError("Could not load submissions");
      setHomeworkLoading(false);
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

  // Build points array for line chart
  const getChartPoints = () => {
    if (!selectedSubjectId || examResults.length === 0) return [];

    // Filter results for selected subject and sort chronologically
    const filtered = examResults
      .filter((r) => {
        const exam = Array.isArray(r.exam) ? r.exam[0] : r.exam;
        return exam && exam.subject_id === selectedSubjectId && r.marks_obtained !== null;
      })
      .map((r) => {
        const exam = Array.isArray(r.exam) ? r.exam[0] : r.exam;
        const pct = (Number(r.marks_obtained) / Number(exam.total_marks || 100)) * 100;
        return {
          date: new Date(exam.exam_date),
          score: pct,
          month: dayjs(exam.exam_date).format("MMM"),
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return filtered;
  };

  const renderLineChart = () => {
    const pointsData = getChartPoints();

    if (pointsData.length < 2) {
      return (
        <View className="h-[160px] items-center justify-center">
          <Text className="font-inter text-gray-400 text-sm text-center">
            Not enough exam data yet
          </Text>
        </View>
      );
    }

    const W = SCREEN_WIDTH - 64; // Card width - padding
    const H = 160;
    const paddingLeft = 20;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 25;

    // Map X & Y coordinates
    const N = pointsData.length;
    const points = pointsData.map((p, i) => {
      const x = paddingLeft + (i * (W - paddingLeft - paddingRight)) / (N - 1);
      const y =
        paddingTop + ((100 - p.score) / 100) * (H - paddingTop - paddingBottom);
      return { x, y, label: p.month, score: p.score };
    });

    const pathData = getBezierPath(points);

    // Draw Grid (4 dashed lines at values 25, 50, 75, 100)
    const gridValues = [25, 50, 75, 100];
    const gridLines = gridValues.map((val) => {
      const y =
        paddingTop + ((100 - val) / 100) * (H - paddingTop - paddingBottom);
      return (
        <Line
          key={val}
          x1={paddingLeft}
          y1={y}
          x2={W - paddingRight}
          y2={y}
          stroke="#E4E2E1"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      );
    });

    return (
      <View style={{ width: W, height: H }} className="mt-4 overflow-visible">
        <Svg width={W} height={H}>
          {gridLines}
          {/* Main Smooth Line */}
          <Path d={pathData} fill="none" stroke="#D4AF37" strokeWidth={2.5} />
          {/* Data point circles */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="#D4AF37"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}
          {/* Month labels along X axis */}
          {points.map((p, i) => (
            <SvgText
              key={i}
              x={p.x}
              y={H - 5}
              fontSize={11}
              fontFamily="OpenSans"
              fill="#9CA3AF"
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          ))}
        </Svg>
      </View>
    );
  };

  const renderDonutChart = () => {
    const W = 130;
    const H = 130;
    const size = 130;
    const r = 50;
    const strokeWidth = 16;
    const circumference = 2 * Math.PI * r;

    const percentage =
      homeworkTotal > 0 ? Math.round((homeworkSubmitted / homeworkTotal) * 100) : 0;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <View style={{ width: W, height: H }} className="justify-center items-center relative my-4">
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#E4E2E1"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
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
          <Text
            style={{ fontFamily: "Poppins-Bold", color: "#0D1B2A" }}
            className="text-[22px] font-bold"
          >
            {percentage}%
          </Text>
        </View>
      </View>
    );
  };

  // Render recent submissions list (max 5 rows)
  const renderSubmissionsTable = () => {
    const displayedSubmissions = recentSubmissions.slice(0, 5);

    if (displayedSubmissions.length === 0) {
      return (
        <View className="py-6 items-center justify-center">
          <Text className="font-inter text-gray-400 text-sm text-center">
            No submissions yet
          </Text>
        </View>
      );
    }

    return (
      <View className="mt-4">
        {/* Table Header */}
        <View className="flex-row justify-between py-2 border-b border-[#E4E2E1] px-1">
          <View className="flex-[2]">
            <Text
              style={{ fontFamily: "OpenSans-Bold", fontSize: 10, letterSpacing: 0.5 }}
              className="text-[#44474C] uppercase font-bold"
            >
              ASSIGNMENT
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text
              style={{ fontFamily: "OpenSans-Bold", fontSize: 10, letterSpacing: 0.5 }}
              className="text-[#44474C] uppercase font-bold text-center"
            >
              DATE
            </Text>
          </View>
          <View className="flex-1 items-end">
            <Text
              style={{ fontFamily: "OpenSans-Bold", fontSize: 10, letterSpacing: 0.5 }}
              className="text-[#44474C] uppercase font-bold text-right"
            >
              SCORE
            </Text>
          </View>
        </View>

        {/* Table Rows */}
        {displayedSubmissions.map((sub, index) => {
          const hw = Array.isArray(sub.homework) ? sub.homework[0] : sub.homework;
          const title = hw?.title || "Homework Assignment";
          const maxMarks = hw?.total_marks || 100;
          const scoreStr = sub.marks_obtained !== null ? `${sub.marks_obtained}/${maxMarks}` : "—";
          const formattedDate = dayjs(sub.submitted_at).format("MMM DD, YYYY");

          return (
            <View
              key={sub.id || index}
              className="flex-row justify-between items-center py-3 border-b border-[#E4E2E1] px-1 last:border-b-0"
            >
              <View className="flex-[2] pr-2">
                <Text
                  className="font-inter-medium text-[13px] text-[#0D1B2A] leading-tight"
                  numberOfLines={2}
                >
                  {title}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="font-inter text-gray-500 text-[12px] text-center">
                  {formattedDate}
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text
                  className={`font-inter-bold text-[13px] text-right ${
                    sub.marks_obtained !== null ? "text-[#0D1B2A]" : "text-gray-400 font-medium"
                  }`}
                >
                  {scoreStr}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      {/* ─── Local Custom Premium Header ──────────────────────── */}
      <View
        style={{
          paddingTop: 48,
          paddingBottom: 12,
        }}
        className="bg-white border-b border-[#E4E2E1] px-4 flex-row items-center justify-between z-50"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="p-1 w-10 items-start"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>

        <Text
          style={{ fontFamily: "Poppins-Bold" }}
          className="font-poppins-bold text-[18px] text-[#0D1B2A] flex-1 text-center"
        >
          Student Profile
        </Text>

        <View className="flex-row items-center space-x-3 w-10 justify-end">
          <TouchableOpacity activeOpacity={0.7} className="p-1 relative">
            <Ionicons name="notifications-outline" size={22} color="#0D1B2A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Page Scroll Content ──────────────────────── */}
      {profileLoading && !student ? (
        <View className="p-4 flex-1">
          <CardSkeleton height={180} />
          <CardSkeleton height={240} />
          <CardSkeleton height={200} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          {profileError && (
            <View className="mx-4 mt-6 bg-red-50 p-4 rounded-xl border border-red-200 flex-row items-center justify-between">
              <Text className="font-inter text-red-700 text-sm flex-1 mr-2">{profileError}</Text>
              <TouchableOpacity
                onPress={() => loadProfileAndRank()}
                className="bg-white border border-red-300 px-3 py-1.5 rounded-lg"
              >
                <Text className="font-inter-medium text-red-700 text-xs">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!profileError && student && (
            <>
              {/* Section 1: Student Hero */}
              <View className="items-center py-6 px-4 mb-2">
                <View className="relative w-20 h-20 mb-3">
                  {student.avatar_url ? (
                    <Image
                      source={{ uri: student.avatar_url }}
                      className="w-20 h-20 rounded-full border-2 border-white"
                    />
                  ) : (
                    <View className="w-20 h-20 rounded-full bg-[#0D1B2A] items-center justify-center border-2 border-white">
                      <Text className="font-poppins-bold text-3xl text-[#D4AF37]">
                        {getInitials(student.full_name)}
                      </Text>
                    </View>
                  )}
                  {/* Star Badge */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#D4AF37",
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1.5,
                      borderColor: "#FFFFFF",
                    }}
                  >
                    <Ionicons name="star" size={12} color="#0D1B2A" />
                  </View>
                </View>

                <Text
                  style={{ fontFamily: "Poppins-Bold" }}
                  className="text-2xl font-bold text-[#0D1B2A] text-center"
                >
                  {student.full_name}
                </Text>

                <View
                  style={{ backgroundColor: "#D4AF37", borderRadius: 9999 }}
                  className="px-3 py-1 mt-1.5 items-center justify-center"
                >
                  <Text
                    style={{ fontFamily: "Poppins-SemiBold", fontSize: 12 }}
                    className="text-[#0D1B2A]"
                  >
                    {student.class_name}-{student.section_name}
                  </Text>
                </View>

                <Text
                  style={{ fontFamily: "Inter-Regular" }}
                  className="text-gray-500 text-[13px] mt-2 text-center"
                >
                  Roll Number: #{student.roll_number || "—"}
                </Text>

                {/* Mini Stats Row */}
                <View className="flex-row justify-between w-full mt-6 px-2 space-x-4">
                  {/* Stat Card 1: Rank */}
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      shadowColor: "rgba(0,0,0,0.04)",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                    className="flex-1 p-3 flex-row items-center justify-between"
                  >
                    <View>
                      <Text
                        style={{
                          fontFamily: "OpenSans-Bold",
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#D4AF37",
                          letterSpacing: 0.5,
                        }}
                      >
                        RANK
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins-Bold",
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#0D1B2A",
                          marginTop: 4,
                        }}
                      >
                        {rank} / {totalStudents || "—"}
                      </Text>
                    </View>
                  </View>

                  {/* Stat Card 2: AI Score */}
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      shadowColor: "rgba(0,0,0,0.04)",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                    className="flex-1 p-3 flex-row items-center justify-between"
                  >
                    <View>
                      <Text
                        style={{
                          fontFamily: "OpenSans-Bold",
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#D4AF37",
                          letterSpacing: 0.5,
                        }}
                      >
                        SCORE
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins-Bold",
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#0D1B2A",
                          marginTop: 4,
                        }}
                      >
                        {avgAiScore}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Section 2: Marks History Card */}
              <View className="px-4">
                {chartLoading ? (
                  <CardSkeleton height={240} />
                ) : chartError ? (
                  <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
                    <Text className="font-inter text-red-500 text-sm mb-2">{chartError}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        loadSubjectDropdownAndExams(
                          student.id,
                          student.teacher_id,
                          student.section_id
                        )
                      }
                      className="bg-[#D4AF37] px-4 py-2 rounded-lg items-center"
                    >
                      <Text className="font-inter-semibold text-xs text-[#0D1B2A]">Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      shadowColor: "rgba(0,0,0,0.04)",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                    className="p-4 mb-4 border border-gray-100"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        style={{ fontFamily: "Poppins-SemiBold", color: "#0D1B2A" }}
                        className="text-base font-bold"
                      >
                        Marks History
                      </Text>

                      <SubjectDropdown
                        options={subjects}
                        selectedId={selectedSubjectId}
                        onSelect={setSelectedSubjectId}
                      />
                    </View>

                    {renderLineChart()}
                  </View>
                )}
              </View>

              {/* Section: Exam Marks Card */}
              <View className="px-4">
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    shadowColor: "rgba(0,0,0,0.04)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  className="p-4 mb-4 border border-gray-100"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Text
                      style={{ fontFamily: "Poppins-SemiBold", color: "#0D1B2A" }}
                      className="text-base font-bold"
                    >
                      Exam Marks
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(true);
                        loadStudentExams();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{ fontFamily: "Inter-SemiBold", color: "#D4AF37" }}
                        className="text-xs underline font-medium"
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Render list of exam marks for the student */}
                  {examResults.length === 0 ? (
                    <Text className="font-inter text-gray-400 text-xs py-2">
                      No exam marks recorded yet.
                    </Text>
                  ) : (
                    <View className="space-y-2">
                      {examResults.slice(0, 3).map((res, index) => {
                        const exam = Array.isArray(res.exam) ? res.exam[0] : res.exam;
                        const examName = exam?.exam_name || "Exam";
                        const totalMarks = exam?.total_marks || 100;
                        const marksVal = res.marks_obtained !== null ? `${res.marks_obtained}/${totalMarks}` : "—";
                        const examDate = exam?.exam_date ? dayjs(exam.exam_date).format("DD MMM YYYY") : "";

                        return (
                          <View
                            key={exam?.id || index}
                            className="flex-row justify-between items-center py-2 border-b border-gray-50 last:border-b-0"
                          >
                            <View className="flex-1 pr-2">
                              <Text
                                style={{ fontFamily: "Inter-Medium" }}
                                className="text-[#0D1B2A] text-sm font-semibold"
                                numberOfLines={1}
                              >
                                {examName}
                              </Text>
                              <Text className="font-inter text-gray-400 text-[11px] mt-0.5">
                                {examDate}
                              </Text>
                            </View>
                            <Text
                              style={{ fontFamily: "Poppins-Bold" }}
                              className="text-[#0D1B2A] text-sm font-bold"
                            >
                              {marksVal}
                            </Text>
                          </View>
                        );
                      })}
                      {examResults.length > 3 && (
                        <Text className="font-inter text-gray-400 text-[11px] text-center mt-1">
                          + {examResults.length - 3} more exams
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Section 3: AI Engagement Card */}
              <View className="px-4">
                <View
                  style={{
                    backgroundColor: "#0D1B2A", // Navy background
                    borderRadius: 16,
                    shadowColor: "rgba(0,0,0,0.04)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  className="p-4 mb-4"
                >
                  <View className="flex-row items-center space-x-2">
                    <Ionicons name="bulb-outline" size={20} color="#D4AF37" />
                    <Text
                      style={{ fontFamily: "Poppins-SemiBold" }}
                      className="text-base font-bold text-white"
                    >
                      AI Engagement
                    </Text>
                  </View>
                  <Text
                    style={{ fontFamily: "Inter-Regular" }}
                    className="text-white/60 text-xs mt-0.5"
                  >
                    Learning velocity & focus analytics
                  </Text>

                  {/* 3 Metric Rows */}
                  {/* Metric 1 */}
                  <View className="mt-4">
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="font-inter-medium text-[13px] text-white">
                        Concept clarity
                      </Text>
                      <Text className="font-inter-bold text-[13px] text-[#D4AF37]">
                        {aiEngagement.conceptClarity !== "—" ? `${aiEngagement.conceptClarity}/10` : "—"}
                      </Text>
                    </View>
                    <View className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <View
                        style={{
                          width: aiEngagement.conceptClarity !== "—"
                            ? `${parseFloat(aiEngagement.conceptClarity) * 10}%`
                            : "0%"
                        }}
                        className="h-full bg-[#D4AF37] rounded-full"
                      />
                    </View>
                  </View>

                  {/* Metric 2 */}
                  <View className="mt-3">
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="font-inter-medium text-[13px] text-white">
                        Completeness
                      </Text>
                      <Text className="font-inter-bold text-[13px] text-[#D4AF37]">
                        {aiEngagement.completeness !== "—" ? `${aiEngagement.completeness}/10` : "—"}
                      </Text>
                    </View>
                    <View className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <View
                        style={{
                          width: aiEngagement.completeness !== "—"
                            ? `${parseFloat(aiEngagement.completeness) * 10}%`
                            : "0%"
                        }}
                        className="h-full bg-[#D4AF37] rounded-full"
                      />
                    </View>
                  </View>

                  {/* Metric 3 */}
                  <View className="mt-3">
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="font-inter-medium text-[13px] text-white">
                        presentation
                      </Text>
                      <Text className="font-inter-bold text-[13px] text-[#D4AF37]">
                        {aiEngagement.presentation !== "—" ? `${aiEngagement.presentation}/10` : "—"}
                      </Text>
                    </View>
                    <View className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <View
                        style={{
                          width: aiEngagement.presentation !== "—"
                            ? `${parseFloat(aiEngagement.presentation) * 10}%`
                            : "0%"
                        }}
                        className="h-full bg-[#D4AF37] rounded-full"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Section 4: Homework Submission Card */}
              <View className="px-4">
                {homeworkLoading ? (
                  <CardSkeleton height={200} />
                ) : homeworkError ? (
                  <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
                    <Text className="font-inter text-red-500 text-sm mb-2">{homeworkError}</Text>
                    <TouchableOpacity
                      onPress={() => loadHomeworkStats(student.id, student.class_id, student.teacher_id)}
                      className="bg-[#D4AF37] px-4 py-2 rounded-lg items-center"
                    >
                      <Text className="font-inter-semibold text-xs text-[#0D1B2A]">Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      shadowColor: "rgba(0,0,0,0.04)",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                    className="p-4 mb-4 items-center border border-gray-100"
                  >
                    <Text
                      style={{
                        fontFamily: "OpenSans-Bold",
                        fontSize: 10,
                        fontWeight: "700",
                        color: "#D4AF37",
                        letterSpacing: 0.5,
                      }}
                      className="text-center mb-2"
                    >
                      HOMEWORK SUBMISSION
                    </Text>

                    {renderDonutChart()}

                    <Text
                      style={{ fontFamily: "Inter-Regular" }}
                      className="text-gray-500 text-[13px] text-center"
                    >
                      {homeworkSubmitted} of {homeworkTotal} Assignments Submitted
                    </Text>
                  </View>
                )}
              </View>

              {/* Section 5: Recent Submissions Table */}
              <View className="px-4">
                {!homeworkLoading && !homeworkError && (
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      shadowColor: "rgba(0,0,0,0.04)",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                    className="p-4 border border-gray-100"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        style={{ fontFamily: "Poppins-SemiBold", color: "#0D1B2A" }}
                        className="text-base font-bold"
                      >
                        Recent Submissions
                      </Text>
                      <TouchableOpacity activeOpacity={0.7}>
                        <Text
                          style={{ fontFamily: "Inter-Medium", color: "#D4AF37" }}
                          className="text-xs underline font-medium"
                        >
                          View All
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {renderSubmissionsTable()}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* MarksEditModal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "80%",
            }}
          >
            {/* Drag Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#E4E2E1",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            <Text
              style={{ fontFamily: "Poppins-SemiBold" }}
              className="text-[#0D1B2A] text-lg font-bold mb-4"
            >
              Edit Marks for {student?.full_name}
            </Text>

            {modalLoading && modalExams.length === 0 ? (
              <View className="py-12 justify-center items-center">
                <ActivityIndicator size="large" color="#D4AF37" />
              </View>
            ) : (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
              >
                {modalExams.length === 0 ? (
                  <Text className="font-inter text-gray-400 text-xs py-4 text-center">
                    No exams found for this class.
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 240 }} className="mb-6" showsVerticalScrollIndicator={false}>
                    {modalExams.map((exam) => {
                      const isInvalid = isModalInputInvalid(exam.id);
                      return (
                        <View
                          key={exam.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: "#E4E2E1",
                          }}
                        >
                          <View className="flex-1 pr-2">
                            <Text
                              style={{ fontFamily: "Poppins-Medium" }}
                              className="text-[#0D1B2A] text-sm font-semibold"
                            >
                              {exam.exam_name}
                            </Text>
                            <Text className="font-inter text-gray-400 text-[11px] mt-0.5">
                              {exam.subject_name} • {dayjs(exam.exam_date).format("DD MMM YYYY")}
                            </Text>
                          </View>

                          <View className="items-end">
                            <TextInput
                              style={{
                                width: 72,
                                height: 36,
                                textAlign: "center",
                                borderWidth: 1,
                                borderColor: isInvalid ? "#DC2626" : "#E4E2E1",
                                borderRadius: 8,
                                fontFamily: "Poppins-Bold",
                                fontSize: 14,
                                color: "#0D1B2A",
                                backgroundColor: "#FFFFFF",
                              }}
                              placeholder="—"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="numeric"
                              value={modalMarks[exam.id] || ""}
                              onChangeText={(val) => handleModalMarkChange(exam.id, val)}
                            />
                            {isInvalid && (
                              <Text
                                style={{ fontFamily: "OpenSans" }}
                                className="text-[10px] text-[#DC2626] mt-0.5"
                              >
                                Max {exam.total_marks}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Save and Cancel buttons */}
                <View className="space-y-2">
                  <TouchableOpacity
                    disabled={!hasModalChanges() || hasAnyModalValidationErrors() || modalLoading}
                    onPress={saveStudentMarks}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: "#0D1B2A",
                      height: 48,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: (!hasModalChanges() || hasAnyModalValidationErrors() || modalLoading) ? 0.5 : 1,
                    }}
                    className="w-full flex-row text-center justify-center"
                  >
                    {modalLoading && (
                      <ActivityIndicator size="small" color="#D4AF37" className="mr-2" />
                    )}
                    <Text
                      style={{ fontFamily: "Poppins-SemiBold", color: "#D4AF37" }}
                      className="text-sm font-bold text-center"
                    >
                      {modalLoading ? "Saving..." : "Save Marks"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.7}
                    style={{
                      height: 48,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    className="w-full"
                  >
                    <Text
                      style={{ fontFamily: "Poppins-SemiBold" }}
                      className="text-[#0D1B2A] text-sm font-semibold text-center"
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
