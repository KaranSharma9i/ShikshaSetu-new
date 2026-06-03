import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { getStudentProfileByUserId, getStudentHomeworks, submitHomework } from "@/src/repositories/studentRepository";
import { HomeworkItem, HomeworkSubmission } from "@/src/types/homework";
import Header from "../../components/student/Header";
import BottomNavBar from "../../components/student/BottomNavBar";

// Subject branding helpers
function getSubjectTheme(code: string) {
  switch (code.toUpperCase()) {
    case "MAT":
      return { color: "#2563EB", bg: "#EFF6FF", icon: "calculator-outline" };
    case "SCI":
      return { color: "#16A34A", bg: "#ECFDF5", icon: "flask-outline" };
    case "ENG":
      return { color: "#7C3AED", bg: "#F5F3FF", icon: "book-outline" };
    case "SST":
      return { color: "#D97706", bg: "#FFFBEB", icon: "earth-outline" };
    case "CS":
      return { color: "#0891B2", bg: "#ECFEFF", icon: "desktop-outline" };
    case "HIN":
      return { color: "#EA580C", bg: "#FFF7ED", icon: "language-outline" };
    case "SAN":
      return { color: "#DB2777", bg: "#FDF2F8", icon: "library-outline" };
    case "PE":
      return { color: "#65A30D", bg: "#F7FEE7", icon: "barbell-outline" };
    default:
      return { color: "#4B5563", bg: "#F9FAFB", icon: "document-text-outline" };
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HomeworkScreen() {
  const router = useRouter();
  const { userId, isSignedIn, isLoaded } = useAuth();
  
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);
  
  // Simulated file upload states
  const [simulatedFile, setSimulatedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchHomeworkData = useCallback(async (showSkeleton = true) => {
    if (!userId) return;
    if (showSkeleton) setIsLoading(true);
    
    try {
      const profile = await getStudentProfileByUserId(userId);
      if (profile) {
        setStudentProfile(profile);
        const data = await getStudentHomeworks(profile.id, profile.class_id || "");
        setHomeworks(data);
      }
    } catch (error) {
      console.error("Error loading homework screen data:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/onboarding");
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchHomeworkData();
    }
  }, [isLoaded, isSignedIn, userId, fetchHomeworkData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeworkData(false);
  };

  // Submission helpers
  const handleSimulateFileSelect = () => {
    setIsUploading(true);
    // Simulate a premium upload progress
    setTimeout(() => {
      const randomDocs = [
        "linear_equations_sol.pdf",
        "photosynthesis_chart.png",
        "tenses_grammar_sheet.docx",
        "social_studies_essay.pdf"
      ];
      const selected = randomDocs[Math.floor(Math.random() * randomDocs.length)];
      setSimulatedFile(selected);
      setIsUploading(false);
    }, 1200);
  };

  const handleSubmittingSolution = async () => {
    if (!selectedHw || !simulatedFile || !studentProfile) return;
    setSubmitting(true);

    try {
      const result = await submitHomework(selectedHw.id, studentProfile.id, null);
      
      if (result) {
        Alert.alert("Success", "Your homework solution has been submitted successfully!");
        // Clear simulation state
        setSimulatedFile(null);
        // Refresh list
        await fetchHomeworkData(false);
        // Close modal
        setSelectedHw(null);
      } else {
        Alert.alert("Error", "Failed to submit homework. Please try again.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredHomeworks = homeworks.filter(hw => {
    const isCompleted = hw.submission !== null;
    const isScored = hw.submission?.status === "scored";
    const isSubmitted = hw.submission?.status === "submitted";
    
    if (activeTab === "pending") return !isCompleted;
    if (activeTab === "submitted") return isSubmitted;
    if (activeTab === "graded") return isScored;
    return true; // all
  });

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  if (!isLoaded || !isSignedIn) {
    return (
      <View className="flex-1 bg-[#fbf9f8] justify-center items-center">
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fbf9f8]">
      {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}
      
      {/* Header */}
      <Header
        studentName={studentProfile?.full_name}
        profilePhotoUrl={studentProfile?.profile_photo_url}
      />

      {/* Main Content Area */}
      <View className="flex-1">
        {/* Title and Summary bar */}
        <View className="px-5 pt-5 pb-3">
          <Text className="font-poppins-bold text-2xl text-[#0D1B2A]">My Homework</Text>
          <Text className="font-inter text-gray-500 text-xs mt-0.5">
            Class {studentProfile?.class_name || "—"} · Section {studentProfile?.section_name || "—"}
          </Text>
        </View>

        {/* Tab Filter Bar */}
        <View className="px-5 mb-4">
          <View className="bg-gray-100 p-1 rounded-xl flex-row">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "submitted", label: "Submitted" },
              { id: "graded", label: "Graded" }
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2.5 rounded-lg items-center ${
                  activeTab === tab.id ? "bg-[#0D1B2A]" : "bg-transparent"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-poppins-semibold text-xs ${
                    activeTab === tab.id ? "text-white" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List of Homework */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0D1B2A" />
            <Text className="font-inter text-gray-500 text-xs mt-3">Loading assignments...</Text>
          </View>
        ) : filteredHomeworks.length === 0 ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, paddingHorizontal: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View className="w-16 h-16 bg-gray-100 rounded-2xl justify-center items-center mb-4">
              <Ionicons name="document-text-outline" size={28} color="#9CA3AF" />
            </View>
            <Text className="font-poppins-semibold text-[#0D1B2A] text-center text-sm">
              No homework found
            </Text>
            <Text className="font-inter text-gray-400 text-center text-xs mt-1">
              {activeTab === "all"
                ? "No active assignments posted for your class."
                : `No assignments match the "${activeTab}" filter.`}
            </Text>
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {filteredHomeworks.map((hw) => {
              const theme = getSubjectTheme(hw.subject_code);
              const isSubmitted = hw.submission !== null;
              const isScored = hw.submission?.status === "scored";
              const isOverdue = !isSubmitted && new Date(hw.due_date) < new Date(new Date().toISOString().split('T')[0]);
              const isDueToday = !isSubmitted && hw.due_date === new Date().toISOString().split('T')[0];

              return (
                <TouchableOpacity
                  key={hw.id}
                  onPress={() => router.push(`/homework/${hw.id}` as any)}
                  className="bg-white rounded-2xl mb-4 border border-gray-100 shadow-sm overflow-hidden flex-row"
                  activeOpacity={0.9}
                  style={{
                    shadowColor: "#0d1b2a",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  {/* Left branding colored strip */}
                  <View style={{ width: 6, backgroundColor: theme.color }} />

                  {/* Main card contents */}
                  <View className="flex-1 p-4">
                    {/* Header: Subject + Difficulty */}
                    <View className="flex-row justify-between items-center mb-2">
                      <View className="flex-row items-center space-x-2">
                        <View style={{ backgroundColor: theme.bg }} className="p-1 rounded-md">
                          <Ionicons name={theme.icon as any} size={14} color={theme.color} />
                        </View>
                        <Text className="font-opensans text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          {hw.subject_name}
                        </Text>
                      </View>

                      {/* Difficulty Badge */}
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          hw.difficulty === "Easy"
                            ? "bg-green-50 border border-green-100"
                            : hw.difficulty === "Medium"
                            ? "bg-amber-50 border border-amber-100"
                            : "bg-red-50 border border-red-100"
                        }`}
                      >
                        <Text
                          className={`font-opensans text-[9px] font-bold ${
                            hw.difficulty === "Easy"
                              ? "text-green-600"
                              : hw.difficulty === "Medium"
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {hw.difficulty}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text className="font-poppins-semibold text-sm text-[#0D1B2A] leading-tight mb-3" numberOfLines={2}>
                      {hw.title}
                    </Text>

                    {/* Footer stats: Due Date + Marks */}
                    <View className="flex-row justify-between items-center pt-3 border-t border-gray-50">
                      <View className="flex-row items-center space-x-1">
                        <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                        <Text className="font-inter text-gray-400 text-[11px]">
                          Due: {formatDate(hw.due_date)}
                        </Text>
                      </View>
                      
                      <Text className="font-poppins-medium text-gray-500 text-[11px]">
                        Marks: {hw.total_marks}
                      </Text>
                    </View>

                    {/* Submission status bar indicator */}
                    <View className="mt-3 pt-3 border-t border-gray-50 flex-row items-center justify-between">
                      {isScored ? (
                        <View className="flex-row items-center space-x-1.5">
                          <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                          <Text className="font-inter-medium text-green-600 text-xs">
                            Graded
                          </Text>
                        </View>
                      ) : isSubmitted ? (
                        <View className="flex-row items-center space-x-1.5">
                          <Ionicons name="time" size={14} color="#7C3AED" />
                          <Text className="font-inter-medium text-purple-600 text-xs">
                            Submitted
                          </Text>
                        </View>
                      ) : isOverdue ? (
                        <View className="flex-row items-center space-x-1.5">
                          <Ionicons name="alert-circle" size={14} color="#DC2626" />
                          <Text className="font-inter-medium text-red-600 text-xs font-semibold">
                            Overdue
                          </Text>
                        </View>
                      ) : isDueToday ? (
                        <View className="flex-row items-center space-x-1.5">
                          <Ionicons name="warning" size={14} color="#D97706" />
                          <Text className="font-inter-medium text-amber-600 text-xs font-semibold">
                            Due Today
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center space-x-1.5">
                          <Ionicons name="ellipse-outline" size={14} color="#6B7280" />
                          <Text className="font-inter-medium text-gray-500 text-xs">
                            Pending
                          </Text>
                        </View>
                      )}

                      {/* Display Score if Graded */}
                      {isScored && hw.submission && (
                        <Text className="font-poppins-bold text-xs text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-100">
                          {hw.submission.marks_obtained !== null ? `${hw.submission.marks_obtained}/${hw.total_marks}` : "Graded"}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Homework Detail Sheet / Modal */}
      {selectedHw && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedHw(null)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(13, 27, 42, 0.45)", justifyContent: "flex-end" }}>
            <View 
              className="bg-white rounded-t-[28px] px-6 pt-5 pb-8 max-h-[85%]"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              {/* Drag line handle indicator */}
              <View className="w-12 h-1.5 bg-gray-200 rounded-full align-self-center mx-auto mb-4" />

              {/* Top row: Subject code + Close button */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center space-x-2">
                  <View 
                    style={{ backgroundColor: getSubjectTheme(selectedHw.subject_code).bg }} 
                    className="px-2.5 py-1 rounded-lg"
                  >
                    <Text 
                      style={{ color: getSubjectTheme(selectedHw.subject_code).color }} 
                      className="font-poppins-bold text-[10px] uppercase tracking-wider"
                    >
                      {selectedHw.subject_code}
                    </Text>
                  </View>
                  <Text className="font-inter-medium text-xs text-gray-500">
                    {selectedHw.subject_name} · By {selectedHw.teacher_name}
                  </Text>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedHw(null);
                    setSimulatedFile(null);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color="#0D1B2A" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                {/* Title */}
                <Text className="font-poppins-semibold text-lg text-[#0D1B2A] leading-snug mb-3">
                  {selectedHw.title}
                </Text>

                {/* Dates & Marks Metadata card */}
                <View className="bg-gray-50 rounded-xl p-3 flex-row justify-between mb-4 border border-gray-100">
                  <View className="flex-1">
                    <Text className="font-opensans text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      Assign Date
                    </Text>
                    <Text className="font-inter text-xs text-[#0D1B2A] font-semibold mt-0.5">
                      {formatDate(selectedHw.assign_date)}
                    </Text>
                  </View>
                  <View className="w-[1px] bg-gray-200 mx-3" />
                  <View className="flex-1">
                    <Text className="font-opensans text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center">
                      Due Date
                    </Text>
                    <Text className="font-inter text-xs text-red-600 font-semibold mt-0.5 text-center">
                      {formatDate(selectedHw.due_date)}
                    </Text>
                  </View>
                  <View className="w-[1px] bg-gray-200 mx-3" />
                  <View className="flex-1">
                    <Text className="font-opensans text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right">
                      Max Marks
                    </Text>
                    <Text className="font-inter text-xs text-gray-700 font-semibold mt-0.5 text-right">
                      {selectedHw.total_marks} Marks
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text className="font-poppins-semibold text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                  Instructions
                </Text>
                <Text className="font-inter text-[#0D1B2A] text-sm leading-relaxed mb-5 bg-[#fbf9f8] p-3 rounded-xl border border-gray-100">
                  {selectedHw.description || "No description provided."}
                </Text>

                {/* Question attachment file link */}
                {selectedHw.file_url && (
                  <View className="mb-6">
                    <Text className="font-poppins-semibold text-xs text-gray-400 uppercase tracking-wider mb-2">
                      Reference Material
                    </Text>
                    <TouchableOpacity
                      onPress={() => Alert.alert("Download", `Downloading: ${selectedHw.title.replace(/\s+/g, '_')}_QuestionPaper.pdf`)}
                      className="bg-white border border-gray-200 p-3.5 rounded-xl flex-row items-center justify-between"
                      activeOpacity={0.8}
                    >
                      <View className="flex-row items-center space-x-3">
                        <View className="w-10 h-10 rounded-lg bg-red-50 justify-center items-center">
                          <Ionicons name="document-text" size={20} color="#DC2626" />
                        </View>
                        <View>
                          <Text className="font-inter-medium text-xs text-[#0D1B2A]">
                            Question_Paper.pdf
                          </Text>
                          <Text className="font-inter text-[10px] text-gray-400 mt-0.5">
                            PDF File · 1.4 MB
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="download-outline" size={18} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submission State card */}
                <View className="border-t border-gray-100 pt-5 mt-2">
                  {selectedHw.submission ? (
                    <View>
                      {/* Submissions Section */}
                      <Text className="font-poppins-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">
                        Your Submission
                      </Text>

                      {/* Submitted file description card */}
                      <View className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center space-x-3">
                          <View className="w-10 h-10 rounded-lg bg-purple-50 justify-center items-center">
                            <Ionicons name="document" size={20} color="#7C3AED" />
                          </View>
                          <View className="flex-1">
                            <Text className="font-inter-medium text-xs text-[#0D1B2A]" numberOfLines={1}>
                              {selectedHw.submission.file_url ? selectedHw.submission.file_url.split('/').pop() : "Solution_Document.pdf"}
                            </Text>
                            <Text className="font-inter text-[10px] text-gray-400 mt-0.5">
                              Submitted on {new Date(selectedHw.submission.submitted_at).toLocaleDateString("en-IN")}
                            </Text>
                          </View>
                        </View>
                        
                        <View className="bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                          <Text className="font-inter-medium text-[9px] text-[#7C3AED] uppercase">
                            {selectedHw.submission.status}
                          </Text>
                        </View>
                      </View>

                      {/* Grading details (if Graded) */}
                      {selectedHw.submission.status === "scored" && (
                        <View className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
                          <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center space-x-2">
                              <Ionicons name="ribbon" size={18} color="#D4AF37" />
                              <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
                                Score Card & Feedback
                              </Text>
                            </View>
                            <Text className="font-poppins-bold text-base text-[#16A34A]">
                              {selectedHw.submission.marks_obtained !== null ? `${selectedHw.submission.marks_obtained} / ${selectedHw.total_marks}` : "—"}
                            </Text>
                          </View>

                          {/* Render JSON feedback if present */}
                          {selectedHw.submission.ai_feedback ? (
                            <View>
                              {/* Overall Feedback text */}
                              {selectedHw.submission.ai_feedback.overallFeedback && (
                                <View className="bg-gray-50 p-3 rounded-xl mb-3 border border-gray-50">
                                  <Text className="font-inter text-[#0D1B2A] text-xs leading-relaxed">
                                    "{selectedHw.submission.ai_feedback.overallFeedback}"
                                  </Text>
                                </View>
                              )}

                              {/* Detailed Criteria Scores if present */}
                              {selectedHw.submission.ai_feedback.criteriaScores && (
                                <View className="space-y-2 mt-2">
                                  <Text className="font-poppins-semibold text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                                    Criteria Breakdown
                                  </Text>
                                  {Object.entries(selectedHw.submission.ai_feedback.criteriaScores).map(([criteria, score]: any) => (
                                    <View key={criteria} className="flex-row items-center justify-between">
                                      <Text className="font-inter text-xs text-gray-500 capitalize">
                                        {criteria}
                                      </Text>
                                      <View className="flex-row items-center space-x-2 flex-1 justify-end ml-4">
                                        {/* Progress bar */}
                                        <View className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <View 
                                            className="h-full bg-green-500 rounded-full" 
                                            style={{ width: `${score}%` }} 
                                          />
                                        </View>
                                        <Text className="font-poppins-semibold text-xs text-gray-700 min-w-[28px] text-right">
                                          {score}%
                                        </Text>
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          ) : (
                            <Text className="font-inter text-gray-500 text-xs">
                              Graded. No comments provided by teacher.
                            </Text>
                          )}

                          {/* AI Score Badge if present */}
                          {selectedHw.submission.ai_score !== null && (
                            <View className="mt-4 pt-3.5 border-t border-gray-100 flex-row items-center justify-between bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/50">
                              <View className="flex-row items-center space-x-1.5">
                                <Ionicons name="flash-outline" size={14} color="#2563EB" />
                                <Text className="font-poppins-semibold text-[10px] text-blue-600 uppercase tracking-wider">
                                  AI Grading Evaluation
                                </Text>
                              </View>
                              <Text className="font-poppins-bold text-xs text-blue-700">
                                Match score: {selectedHw.submission.ai_score}%
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View>
                      {/* Submission Upload Area */}
                      <Text className="font-poppins-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">
                        Submit Solution
                      </Text>

                      {simulatedFile ? (
                        /* Selected file card state */
                        <View className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                          <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 mb-3">
                            <View className="flex-row items-center space-x-3">
                              <Ionicons name="document-attach-outline" size={20} color="#0D1B2A" />
                              <Text className="font-inter-semibold text-xs text-[#0D1B2A]" numberOfLines={1}>
                                {simulatedFile}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => setSimulatedFile(null)}
                              className="p-1"
                            >
                              <Ionicons name="trash-outline" size={16} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                          
                          {/* Submit button */}
                          <TouchableOpacity
                            onPress={handleSubmittingSolution}
                            disabled={submitting}
                            className="bg-[#0D1B2A] py-3.5 rounded-xl items-center flex-row justify-center space-x-2"
                            activeOpacity={0.8}
                          >
                            {submitting ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                                <Text className="font-poppins-bold text-xs text-white uppercase tracking-wider">
                                  Submit Assignment
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* Drag and drop simulated button */
                        <TouchableOpacity
                          onPress={handleSimulateFileSelect}
                          disabled={isUploading}
                          className="bg-[#fbf9f8] border-2 border-dashed border-gray-200 rounded-2xl p-6 justify-center items-center"
                          activeOpacity={0.7}
                        >
                          {isUploading ? (
                            <View className="items-center">
                              <ActivityIndicator size="small" color="#0D1B2A" />
                              <Text className="font-inter text-[11px] text-gray-500 mt-2">
                                Attaching file...
                              </Text>
                            </View>
                          ) : (
                            <View className="items-center">
                              <Ionicons name="cloud-upload" size={32} color="#9CA3AF" />
                              <Text className="font-poppins-semibold text-xs text-[#0D1B2A] mt-2">
                                Upload solution file
                              </Text>
                              <Text className="font-inter text-[10px] text-gray-400 mt-1">
                                PDF, JPG, PNG or DOCX up to 10MB
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Nav Bar */}
      <BottomNavBar />
    </View>
  );
}
