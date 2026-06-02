import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
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

function InsightsSkeleton() {
  return (
    <View className="flex-1 px-5 pt-5 space-y-6">
      {/* Banner Skeleton */}
      <SkeletonBox height={180} borderRadius={16} />
      {/* Label Skeleton */}
      <SkeletonBox width={150} height={18} />
      {/* Document Card Skeleton */}
      <SkeletonBox height={72} borderRadius={16} />
      {/* Label Skeleton */}
      <SkeletonBox width={150} height={18} />
      {/* List Skeletons */}
      <SkeletonBox height={64} borderRadius={16} style={{ marginBottom: 12 }} />
      <SkeletonBox height={64} borderRadius={16} style={{ marginBottom: 12 }} />
      <SkeletonBox height={64} borderRadius={16} />
    </View>
  );
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface HomeworkDetails {
  id: string;
  title: string;
  due_date: string;
  status: string;
  total_marks: number;
  file_url: string | null;
  pdf_url: string | null;
  difficulty: string;
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
}

interface StudentSubmissionItem {
  studentId: string;
  rollNumber: string | null;
  fullName: string;
  profilePhotoUrl: string | null;
  hasSubmitted: boolean;
  submissionId?: string;
  submittedAt?: string;
  marksObtained?: number | null;
  aiScore?: number | null;
  status?: string;
}

export default function HomeworkInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, isLoaded, isSignedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homework, setHomework] = useState<HomeworkDetails | null>(null);
  const [submissions, setSubmissions] = useState<StudentSubmissionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Statistics
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [avgAiScore, setAvgAiScore] = useState<string>("—");

  const fetchInsightsData = useCallback(async (showSkeleton = true) => {
    if (!id) return;
    if (showSkeleton) setLoading(true);
    setError(null);

    try {
      // 1. Fetch homework details
      const { data: hwData, error: hwErr } = await supabase
        .from("homework")
        .select(`
          id,
          title,
          due_date,
          status,
          total_marks,
          file_url,
          pdf_url,
          difficulty,
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
        .eq("id", id)
        .single();

      if (hwErr || !hwData) {
        console.error("Error fetching homework details:", hwErr);
        setError("Could not retrieve homework information.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const classObj = Array.isArray(hwData.class) ? hwData.class[0] : hwData.class;
      const sectionObj = Array.isArray(hwData.section) ? hwData.section[0] : hwData.section;
      const subjectObj = Array.isArray(hwData.subject) ? hwData.subject[0] : hwData.subject;

      const formattedHomework: HomeworkDetails = {
        id: hwData.id,
        title: hwData.title,
        due_date: hwData.due_date,
        status: hwData.status || "active",
        total_marks: hwData.total_marks ? Number(hwData.total_marks) : 100,
        file_url: hwData.file_url,
        pdf_url: hwData.pdf_url,
        difficulty: hwData.difficulty || "Medium",
        class: classObj ? { id: classObj.id, name: classObj.name } : null,
        section: sectionObj ? { id: sectionObj.id, name: sectionObj.name } : null,
        subject: subjectObj ? { id: subjectObj.id, name: subjectObj.name } : null,
      };

      setHomework(formattedHomework);

      const sectionId = formattedHomework.section?.id;

      if (!sectionId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Fetch all active enrolled students for the homework's section
      const { data: enrollmentsData, error: enrollmentsErr } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          roll_number,
          student:students!inner (
            id,
            user:users!inner (
              full_name,
              profile_photo_url
            )
          )
        `)
        .eq("section_id", sectionId)
        .eq("is_active", true);

      if (enrollmentsErr) {
        console.error("Error fetching section enrollments:", enrollmentsErr);
        setError("Failed to load section students.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 3. Fetch submissions for this homework assignment
      const { data: submissionsData, error: submissionsErr } = await supabase
        .from("homework_submissions")
        .select("id, student_id, submitted_at, marks_obtained, feedback, status, ai_score, file_url")
        .eq("homework_id", id);

      if (submissionsErr) {
        console.error("Error fetching homework submissions:", submissionsErr);
        setError("Failed to load submissions list.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 4. Map & Combine Students with their Submissions
      let totalSub = 0;
      let totalAiSum = 0;
      let aiCount = 0;

      const combinedList: StudentSubmissionItem[] = (enrollmentsData || []).map((enroll: any) => {
        const studentObj = Array.isArray(enroll.student) ? enroll.student[0] : enroll.student;
        const userObj = studentObj ? (Array.isArray(studentObj.user) ? studentObj.user[0] : studentObj.user) : null;
        
        const submission = (submissionsData || []).find(
          (sub) => sub.student_id === enroll.student_id
        );

        const hasSub = !!submission;
        if (hasSub) totalSub++;

        let studentAiScore: number | null = null;
        if (submission && submission.ai_score !== null) {
          studentAiScore = Number(submission.ai_score);
          totalAiSum += studentAiScore;
          aiCount++;
        }

        return {
          studentId: enroll.student_id,
          rollNumber: enroll.roll_number,
          fullName: userObj?.full_name || "Unknown Student",
          profilePhotoUrl: userObj?.profile_photo_url || null,
          hasSubmitted: hasSub,
          submissionId: submission?.id,
          submittedAt: submission?.submitted_at,
          marksObtained: submission?.marks_obtained ? Number(submission.marks_obtained) : null,
          aiScore: studentAiScore,
          status: submission?.status,
        };
      });

      // Sort students alphabetically by full name
      combinedList.sort((a, b) => a.fullName.localeCompare(b.fullName));

      // Calculate statistics
      setTotalStudentsCount(combinedList.length);
      setSubmittedCount(totalSub);
      setSubmissions(combinedList);

      if (aiCount > 0) {
        const avg = totalAiSum / aiCount;
        setAvgAiScore(avg.toFixed(1));
      } else {
        setAvgAiScore("—");
      }

      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error("Unexpected error loading homework insights:", err);
      setError("An unexpected error occurred.");
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchInsightsData();
    }
  }, [isLoaded, isSignedIn, userId, fetchInsightsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsightsData(false);
  };

  const handleOpenPdf = async () => {
    const activeUrl = homework?.pdf_url || homework?.file_url;
    if (activeUrl) {
      try {
        await Linking.openURL(activeUrl);
      } catch (err) {
        Alert.alert("Error", "Could not open document URL.");
      }
    } else {
      Alert.alert(
        "Assignment Document",
        "This assignment does not have a custom PDF attached. Opening fallback mock preview.",
        [{ text: "OK" }]
      );
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getFilenameFromUrl = (url: string | null) => {
    if (!url) return "States_of_Matter_Assignment.pdf";
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    return filename.split("?")[0] || "States_of_Matter_Assignment.pdf";
  };

  const formatGradeName = (name: string) => {
    if (!name) return "";
    return name.includes("Class") ? name.replace("Class", "Grade") : name;
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 bg-[#F7F3EB] justify-center items-center">
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  // Calculate dynamic submissions percentage
  const submissionsPercent = totalStudentsCount > 0 ? (submittedCount / totalStudentsCount) * 100 : 0;

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      <Header title="Homework Details" showBack={true} onBack={() => router.back()} />

      {loading ? (
        <InsightsSkeleton />
      ) : error ? (
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle" size={48} color="#DC2626" />
          <Text className="font-poppins-semibold text-lg text-[#0D1B2A] text-center mt-3">
            Error Loading Details
          </Text>
          <Text className="font-inter text-gray-500 text-center mt-1">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchInsightsData(true)}
            activeOpacity={0.7}
            className="mt-4 px-6 py-2.5 bg-[#0D1B2A] rounded-lg"
          >
            <Text className="font-poppins-semibold text-xs text-white">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : !homework ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="font-poppins-semibold text-[#0D1B2A]">Homework not found</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Navy Banner Card */}
          <View
            className="bg-[#0D1B2A] rounded-3xl p-5 mb-6 shadow-md"
            style={{
              shadowColor: "#0D1B2A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text className="font-opensans-bold text-[11px] font-bold text-[#D4AF37] tracking-wider uppercase mb-1">
              {homework.subject?.name || "Subject"} - {homework.class ? formatGradeName(homework.class.name) : "Grade"}
            </Text>

            <Text className="font-poppins-bold text-white text-xl leading-snug mb-5">
              {homework.title}
            </Text>

            {/* Statistics boxes */}
            <View className="flex-row justify-between space-x-3.5">
              {/* Box 1: Submissions */}
              <View className="flex-1 bg-white/10 rounded-2xl p-3.5 border border-white/5">
                <Text className="font-opensans text-[9px] font-bold text-gray-300 tracking-wider uppercase mb-1">
                  Submissions
                </Text>
                <Text className="font-poppins-bold text-2xl text-[#FED65B]">
                  {submittedCount}/{totalStudentsCount}
                </Text>
                
                {/* Horizontal Progress Bar */}
                <View className="h-1.5 w-full bg-white/20 rounded-full mt-2.5 overflow-hidden">
                  <View
                    style={{ width: `${submissionsPercent}%` }}
                    className="h-full bg-[#D4AF37] rounded-full"
                  />
                </View>
              </View>

              {/* Box 2: Average AI Score */}
              <View className="flex-1 bg-white/10 rounded-2xl p-3.5 border border-white/5">
                <Text className="font-opensans text-[9px] font-bold text-gray-300 tracking-wider uppercase mb-1">
                  Avg. AI Score
                </Text>
                <Text className="font-poppins-bold text-2xl text-[#FED65B]">
                  {avgAiScore}
                </Text>
                <Text className="font-inter text-[9px] text-[#A1A1AA] mt-2.5">
                  Verified Insight
                </Text>
              </View>
            </View>
          </View>

          {/* Section: Assignment Document */}
          <Text className="font-poppins-semibold text-xs text-gray-500 tracking-wider uppercase mb-3">
            Assignment Document
          </Text>

          <View className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-[#E4E2E1] shadow-sm mb-6">
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-red-50 justify-center items-center mr-3">
                <Ionicons name="document-text" size={20} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-xs text-[#0D1B2A]" numberOfLines={1}>
                  {getFilenameFromUrl(homework.pdf_url || homework.file_url)}
                </Text>
                <Text className="font-inter text-[10px] text-gray-400 mt-0.5">
                  2.4 MB • PDF Document
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleOpenPdf}
              activeOpacity={0.8}
              className="bg-[#0D1B2A] px-4 py-2 rounded-xl"
            >
              <Text className="font-poppins-bold text-xs text-white">
                View PDF
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section: Student Submissions */}
          <Text className="font-poppins-semibold text-xs text-gray-500 tracking-wider uppercase mb-3">
            Student Submissions
          </Text>

          {submissions.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 justify-center items-center border border-[#E4E2E1] shadow-sm">
              <Feather name="users" size={28} color="#9CA3AF" />
              <Text className="font-inter text-gray-400 text-xs mt-2 text-center">
                No students enrolled in this section
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {submissions.map((item) => (
                <View
                  key={item.studentId}
                  className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-[#E4E2E1] shadow-sm"
                  style={{
                    borderLeftWidth: item.hasSubmitted ? 4 : 0,
                    borderLeftColor: "#D4AF37",
                  }}
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    {/* Student Avatar */}
                    <View className="w-10 h-10 rounded-full bg-[#0D1B2A] items-center justify-center mr-3">
                      <Text className="font-poppins-bold text-[11px] text-white">
                        {getInitials(item.fullName)}
                      </Text>
                    </View>

                    {/* Student Info */}
                    <View className="flex-1">
                      <Text className="font-inter-semibold text-sm text-[#0D1B2A]" numberOfLines={1}>
                        {item.fullName}
                      </Text>
                      
                      {/* Submission status pill */}
                      <View className="flex-row mt-1">
                        <View
                          className={`px-2 py-0.5 rounded-md ${
                            item.hasSubmitted ? "bg-[#0D1B2A]" : "bg-[#FED65B]"
                          }`}
                        >
                          <Text
                            className={`font-poppins-bold text-[9px] tracking-wider ${
                              item.hasSubmitted ? "text-white" : "text-[#735c00]"
                            }`}
                          >
                            {item.hasSubmitted ? "SUBMITTED" : "PENDING"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* AI Score */}
                  <View className="items-end min-w-[65px]">
                    <Text className="font-inter text-[10px] text-gray-400 uppercase tracking-wider">
                      AI Score
                    </Text>
                    <Text className="font-poppins-bold text-sm text-[#0D1B2A] mt-0.5">
                      {item.aiScore !== null ? item.aiScore : "—"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
