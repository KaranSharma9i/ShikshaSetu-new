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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import dayjs from "dayjs";

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
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error loading teacher:", teacherErr);
        setProfileError("Could not verify teacher profile");
        setProfileLoading(false);
        return;
      }

      // Fetch student profile, enrollment info, and user account details
      const { data: profile, error: profileErr } = await supabase
        .from("students")
        .select(`
          id,
          student_code,
          guardian_name,
          date_of_birth,
          gender,
          blood_group,
          address,
          admission_date,
          guardian_phone,
          enrollments!inner (
            roll_number,
            is_active,
            section_id,
            section:sections!inner (
              id,
              name,
              class:classes!inner (
                id,
                name
              )
            )
          ),
          user:users!inner (
            full_name,
            profile_photo_url,
            email,
            phone
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (profileErr || !profile) {
        console.error("Error fetching student profile:", profileErr);
        setProfileError("Could not load student profile");
        setProfileLoading(false);
        return;
      }

      const userDetails = Array.isArray(profile.user) ? profile.user[0] : profile.user;
      const enrollment = Array.isArray(profile.enrollments)
        ? profile.enrollments[0]
        : profile.enrollments;
      const section = enrollment ? (Array.isArray(enrollment.section) ? enrollment.section[0] : enrollment.section) : null;
      const classObj = section ? (Array.isArray(section.class) ? section.class[0] : section.class) : null;

      const profileObj = {
        id: profile.id,
        student_code: profile.student_code,
        full_name: userDetails?.full_name || "Student",
        avatar_url: userDetails?.profile_photo_url || null,
        email: userDetails?.email || "",
        phone: userDetails?.phone || "",
        roll_number: enrollment?.roll_number || "",
        section_id: section?.id || "",
        section_name: section?.name || "",
        class_id: classObj?.id || "",
        class_name: classObj?.name || "",
      };

      setStudent(profileObj);

      // Compute rank in section & avg AI score in parallel
      computeCohortRank(profile.id, profileObj.section_id, profileObj.class_id);
      loadAIScoreAvg(profile.id);
      loadHomeworkStats(profile.id, profileObj.class_id, teacherData.id);
      loadSubjectDropdownAndExams(profile.id, profileObj.section_id, teacherData.user_id);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setProfileError("Could not load profile");
      setProfileLoading(false);
    }
  };

  // Compute Rank in class section
  const computeCohortRank = async (studentId: string, sectionId: string, classId: string) => {
    try {
      // Fetch enrolled active students in the section
      const { data: cohort } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("section_id", sectionId)
        .eq("is_active", true);

      const studentIds = cohort?.map((e) => e.student_id) || [];
      setTotalStudents(studentIds.length);

      // Fetch exams for class
      const { data: examsData } = await supabase
        .from("exams")
        .select("id, total_marks")
        .eq("class_id", classId);

      const examIds = examsData?.map((e) => e.id) || [];

      let examResultsData: any[] = [];
      if (examIds.length > 0 && studentIds.length > 0) {
        const { data: res } = await supabase
          .from("exam_results")
          .select("student_id, marks_obtained, exam_id")
          .in("student_id", studentIds)
          .in("exam_id", examIds);
        examResultsData = res || [];
      }

      // Compute average percentage for all students in section
      const ranks = studentIds.map((sid) => {
        const sRes = examResultsData.filter(
          (r) => r.student_id === sid && r.marks_obtained !== null
        );
        let obtained = 0;
        let maxMarks = 0;
        sRes.forEach((r) => {
          const ex = examsData?.find((e) => e.id === r.exam_id);
          obtained += Number(r.marks_obtained);
          maxMarks += Number(ex?.total_marks || 100);
        });
        const score = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
        return { student_id: sid, score };
      });

      // Sort desc
      ranks.sort((a, b) => b.score - a.score);

      const studentRankIndex = ranks.findIndex((x) => x.student_id === studentId);
      const studentRank = studentRankIndex !== -1 ? studentRankIndex + 1 : 1;

      // format as 2 digit e.g. "04"
      const rankStr = studentRank < 10 ? `0${studentRank}` : `${studentRank}`;
      setRank(rankStr);
      setProfileLoading(false);
    } catch (err) {
      console.error("Failed to compute cohort rank:", err);
      setRank("—");
      setProfileLoading(false);
    }
  };

  // Load average AI score from ai_scores table
  const loadAIScoreAvg = async (studentId: string) => {
    try {
      const { data: aiScores } = await supabase
        .from("ai_scores")
        .select("score")
        .eq("student_id", studentId);

      if (aiScores && aiScores.length > 0) {
        let sum = 0;
        aiScores.forEach((s) => {
          const val = Number(s.score);
          sum += val > 10 ? val / 10 : val;
        });
        setAvgAiScore((sum / aiScores.length).toFixed(2));
      } else {
        setAvgAiScore("—");
      }
    } catch (err) {
      console.error("Failed to load AI scores:", err);
      setAvgAiScore("—");
    }
  };

  // Load subject dropdown and exam results
  const loadSubjectDropdownAndExams = async (
    studentId: string,
    sectionId: string,
    teacherUserId: string
  ) => {
    try {
      setChartLoading(true);
      setChartError(null);

      // Fetch teacher's subjects for this section from timetable
      const { data: timetableData, error: timetableErr } = await supabase
        .from("timetable")
        .select(`
          class_subjects!inner (
            teacher_id,
            subject:subjects!inner (
              id,
              name
            )
          )
        `)
        .eq("section_id", sectionId);

      if (timetableErr) {
        console.error("Error fetching timetable:", timetableErr);
        setChartError("Could not load subjects");
        setChartLoading(false);
        return;
      }

      // Filter rows taught by this teacher in JS
      const subjectsMap = new Map<string, string>();
      timetableData?.forEach((row: any) => {
        const cs = Array.isArray(row.class_subjects)
          ? row.class_subjects[0]
          : row.class_subjects;
        if (cs && cs.teacher_id === teacherUserId) {
          const sub = Array.isArray(cs.subject) ? cs.subject[0] : cs.subject;
          if (sub) {
            subjectsMap.set(sub.id, sub.name);
          }
        }
      });

      const teacherSubjects = Array.from(subjectsMap.entries()).map(([id, name]) => ({
        id,
        name,
      }));

      setSubjects(teacherSubjects);

      // Fetch all exam results for the student
      const { data: examData, error: erErr } = await supabase
        .from("exam_results")
        .select(`
          marks_obtained,
          exam:exams!inner (
            id,
            exam_date,
            total_marks,
            subject_id
          )
        `)
        .eq("student_id", studentId);

      if (erErr) {
        console.error("Error fetching exam results:", erErr);
        setChartError("Could not load exam data");
        setChartLoading(false);
        return;
      }

      setExamResults(examData || []);

      if (teacherSubjects.length > 0) {
        setSelectedSubjectId(teacherSubjects[0].id);
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

      // Fetch homework assigned by this teacher to student's class
      const { data: homeworks, error: hwErr } = await supabase
        .from("homework")
        .select("id")
        .eq("class_id", classId)
        .eq("teacher_id", teacherId);

      if (hwErr) {
        console.error("Error fetching homeworks:", hwErr);
        setHomeworkError("Could not load assignments");
        setHomeworkLoading(false);
        return;
      }

      const hwIds = homeworks?.map((h) => h.id) || [];
      setHomeworkTotal(hwIds.length);

      if (hwIds.length > 0) {
        // Fetch submissions for this student corresponding to these homework assignments
        const { data: submissions, error: subErr } = await supabase
          .from("homework_submissions")
          .select(`
            id,
            homework_id,
            submitted_at,
            marks_obtained,
            homework:homework (
              title,
              total_marks
            )
          `)
          .eq("student_id", studentId)
          .in("homework_id", hwIds)
          .order("submitted_at", { ascending: false });

        if (subErr) {
          console.error("Error fetching submissions:", subErr);
          setHomeworkError("Could not load submissions");
          setHomeworkLoading(false);
          return;
        }

        setHomeworkSubmitted(submissions?.length || 0);
        setRecentSubmissions(submissions || []);
      } else {
        setHomeworkSubmitted(0);
        setRecentSubmissions([]);
      }
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
                          student.section_id,
                          student.teacher_user_id
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
                      <Text className="font-inter-bold text-[13px] text-[#D4AF37]">8.4/10</Text>
                    </View>
                    <View className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <View style={{ width: "84%" }} className="h-full bg-[#D4AF37] rounded-full" />
                    </View>
                  </View>

                  {/* Metric 2 */}
                  <View className="mt-3">
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="font-inter-medium text-[13px] text-white">
                        Completeness
                      </Text>
                      <Text className="font-inter-bold text-[13px] text-[#D4AF37]">7.2/10</Text>
                    </View>
                    <View className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <View style={{ width: "72%" }} className="h-full bg-[#D4AF37] rounded-full" />
                    </View>
                  </View>

                  {/* Metric 3 */}
                  <View className="mt-3">
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="font-inter-medium text-[13px] text-white">
                        Participation
                      </Text>
                      <Text className="font-inter-bold text-[13px] text-[#D4AF37]">9.1/10</Text>
                    </View>
                    <View className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <View style={{ width: "91%" }} className="h-full bg-[#D4AF37] rounded-full" />
                    </View>
                  </View>

                  {/* // TODO: Replace mock values with:
                      // SELECT criteria_scores FROM ai_scores
                      // WHERE student_id = [id]
                      // Average per criteria key */}
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
    </View>
  );
}
