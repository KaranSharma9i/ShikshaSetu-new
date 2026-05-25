import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/institution/Header";
import BottomNavBar from "@/components/institution/BottomNavBar";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import {
  getStudentProfile,
  getStudentMarks,
  getStudentPreviousResults,
  getStudentAIScores,
} from "@/src/repositories/studentRepository";
import {
  StudentProfile,
  SubjectMarkItem,
  PreviousResultItem,
  StudentAIScoreSummary,
  AIScoreHistoryPoint,
} from "@/src/types/student";

type TabName = "personal" | "marks" | "results" | "ai-score" | "more";

export default function StudentProfileScreen() {
  const router = useRouter();
  const { id: studentId } = useLocalSearchParams<{ id: string }>();
  const { isLoaded, isSignedIn, role } = useAuth();
  
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<TabName>("personal");
  const [aiFilter, setAiFilter] = useState<"this_term" | "this_year" | "all_time">("this_term");

  // Core Data States
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Lazy Loaded Data States
  const [marks, setMarks] = useState<SubjectMarkItem[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);

  const [results, setResults] = useState<PreviousResultItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const [aiSummary, setAiSummary] = useState<StudentAIScoreSummary | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Chart interactivity state
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);

  // 1. Fetch Core Profile on Load
  useEffect(() => {
    if (!studentId) return;

    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const data = await getStudentProfile(studentId!);
        setProfile(data);
      } catch (err) {
        console.error("Error loading student profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [studentId]);

  // 2. Lazy Data Fetching when tabs are clicked
  useEffect(() => {
    if (!studentId) return;

    if (activeTab === "marks" && marks.length === 0) {
      setLoadingMarks(true);
      getStudentMarks(studentId)
        .then(setMarks)
        .catch(console.error)
        .finally(() => setLoadingMarks(false));
    }

    if (activeTab === "results" && results.length === 0) {
      setLoadingResults(true);
      getStudentPreviousResults(studentId)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoadingResults(false));
    }

    if (activeTab === "ai-score") {
      setLoadingAi(true);
      getStudentAIScores(studentId, aiFilter)
        .then((summary) => {
          setAiSummary(summary);
          // Default select the latest score point
          if (summary.history.length > 0) {
            setSelectedPointIdx(summary.history.length - 1);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingAi(false));
    }
  }, [studentId, activeTab, aiFilter]);

  // Protect screen and route-guard check
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.replace("/onboarding");
      } else if (role !== "institution_admin" && role !== "teacher") {
        router.replace("/");
      }
    }
  }, [isLoaded, isSignedIn, role]);

  // Helper to compute initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to draw a smooth SVG Bezier path for the line graph
  const renderLineChart = (history: AIScoreHistoryPoint[]) => {
    if (history.length === 0) return null;

    const screenWidth = Dimensions.get("window").width;
    const paddingLeft = 30;
    const paddingRight = 30;
    const chartWidth = screenWidth - 40; // width of card minus padding
    const chartHeight = 160;

    const minScore = 50; // set a fixed baseline to emphasize changes
    const maxScore = 100;

    const xStep = (chartWidth - paddingLeft - paddingRight) / Math.max(1, history.length - 1);

    // Compute coordinates
    const points = history.map((pt, idx) => {
      const x = paddingLeft + idx * xStep;
      const pct = (pt.score - minScore) / (maxScore - minScore);
      // SVG Y is top-down, so invert it
      const y = chartHeight - 25 - pct * (chartHeight - 45); 
      return { x, y, score: pt.score, date: pt.date };
    });

    // Draw smooth cubic Bezier path
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + xStep / 3;
      const cp1y = p0.y;
      const cp2x = p1.x - xStep / 3;
      const cp2y = p1.y;
      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    // Closed path for filled area under the line (opacity gradient)
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`;

    return (
      <View className="items-center">
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="tealGoldGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#2ABFBF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#C9A84C" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#2ABFBF" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#2ABFBF" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Path
            d={`M ${paddingLeft} ${chartHeight - 20} L ${chartWidth - paddingRight} ${chartHeight - 20}`}
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <Path
            d={`M ${paddingLeft} ${chartHeight / 2} L ${chartWidth - paddingRight} ${chartHeight / 2}`}
            stroke="#E5E7EB"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />

          {/* Area fill */}
          <Path d={areaPath} fill="url(#fillGrad)" />

          {/* Trend Line */}
          <Path
            d={linePath}
            fill="none"
            stroke="url(#tealGoldGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Interactive Dots */}
          {points.map((pt, idx) => {
            const isSelected = selectedPointIdx === idx;
            return (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 6.5 : 4}
                fill={isSelected ? "#C9A84C" : "#2ABFBF"}
                stroke="white"
                strokeWidth={isSelected ? 2.5 : 1.5}
                onPress={() => setSelectedPointIdx(idx)}
              />
            );
          })}

          {/* X Axis dates */}
          {points.map((pt, idx) => {
            // Display only some labels to avoid clutter
            const shouldShowLabel =
              history.length <= 5 || idx === 0 || idx === history.length - 1 || idx === Math.floor(history.length / 2);
            
            if (!shouldShowLabel) return null;

            return (
              <SvgText
                key={idx}
                x={pt.x}
                y={chartHeight - 4}
                fontSize="9"
                fontFamily="Inter-Medium"
                fill="#778598"
                textAnchor="middle"
              >
                {pt.date}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  if (!isLoaded || !isSignedIn || loadingProfile) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F3E8] justify-center items-center">
        <ActivityIndicator size="large" color="#C9A84C" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F3E8] justify-center items-center">
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text className="font-poppins-bold text-sm text-[#0D1B2A] mt-3">Student profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-2 bg-[#C9A84C] rounded-xl">
          <Text className="text-white font-poppins-semibold text-xs">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Calculate Aggregates for Marks
  const totalMax = marks.reduce((acc, m) => acc + m.max_marks, 0);
  const totalObt = marks.reduce((acc, m) => acc + (m.marks_obtained || 0), 0);
  const aggregatePct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3E8]">
      <Header title="Student Profile" showBackButton={true} onBackPress={() => router.push("/students" as any)} />

      <ScrollView className="flex-grow" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Banner Section */}
        <View className="items-center mt-6 mb-6">
          <View className="relative">
            {profile.profile_photo_url ? (
              <Image
                source={{ uri: profile.profile_photo_url }}
                className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-[#ffe088]"
              />
            ) : (
              <View className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-[#ffe088] flex-row items-center justify-center">
                <Text className="font-poppins-bold text-2xl text-[#574500]">
                  {getInitials(profile.full_name)}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0.5 right-0.5 bg-white p-1 rounded-full shadow-md">
              <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
            </View>
          </View>
          <Text className="font-poppins-bold text-xl text-[#0D1B2A] mt-3">
            {profile.full_name}
          </Text>
          <View className="flex-row items-center space-x-2 mt-1.5">
            <Text className="font-poppins-semibold text-[10px] text-[#75777D] uppercase tracking-wider">
              {profile.class_name}-{profile.section_name}
            </Text>
            <Text className="font-poppins text-[10px] text-[#75777D]">|</Text>
            <Text className="font-poppins-semibold text-[10px] text-[#75777D] uppercase tracking-wider">
              Roll No. {profile.roll_number?.split("-")[1] || "—"}
            </Text>
            <Text className="font-poppins text-[10px] text-[#75777D]">|</Text>
            <View className="flex-row items-center space-x-1">
              <View className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
              <Text className="font-poppins-semibold text-[10px] text-[#2E7D32] uppercase tracking-wider">
                Active
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Pills Nav */}
        <View className="mb-5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            className="flex-row"
          >
            {(["personal", "marks", "results", "ai-score", "more"] as TabName[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`mr-4 pb-2 px-1 border-b-2 ${
                  activeTab === tab ? "border-[#ffe088]" : "border-transparent"
                }`}
              >
                <Text
                  className={`font-poppins-bold text-[11px] uppercase tracking-widest ${
                    activeTab === tab ? "text-[#0D1B2A]" : "text-[#75777D]"
                  }`}
                >
                  {tab === "ai-score" ? "AI Score" : tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Contents */}
        <View className="px-5">
          {/* 1. Personal Details Tab */}
          {activeTab === "personal" && (
            <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm space-y-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-poppins-bold text-base text-[#0D1B2A]">Personal Details</Text>
                <Ionicons name="person-outline" size={18} color="#C9A84C" />
              </View>

              <View className="flex-row flex-wrap">
                {/* DOB */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="calendar-outline" size={12} color="#75777D" />
                    <Text className="font-inter text-[10px] text-[#75777D]">DOB</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
                    {profile.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </Text>
                </View>

                {/* Gender */}
                <View className="w-1/2 mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="male-female-outline" size={12} color="#75777D" />
                    <Text className="font-inter text-[10px] text-[#75777D]">Gender</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs text-[#0D1B2A] capitalize">
                    {profile.gender || "—"}
                  </Text>
                </View>

                {/* Blood Group */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="water-outline" size={12} color="#75777D" />
                    <Text className="font-inter text-[10px] text-[#75777D]">Blood Group</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
                    {profile.blood_group || "—"}
                  </Text>
                </View>

                {/* Contact */}
                <View className="w-1/2 mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="call-outline" size={12} color="#75777D" />
                    <Text className="font-inter text-[10px] text-[#75777D]">Contact</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
                    {profile.guardian_phone || "—"}
                  </Text>
                </View>

                {/* Father */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="person-outline" size={12} color="#75777D" />
                    <Text className="font-inter text-[10px] text-[#75777D]">Father's Name</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
                    {profile.guardian_name || "—"}
                  </Text>
                </View>

                {/* Admission Date */}
                <View className="w-1/2 mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="time-outline" size={12} color="#75777D" />
                    <Text className="font-inter text-[10px] text-[#75777D]">Admission Date</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
                    {profile.admission_date
                      ? new Date(profile.admission_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </Text>
                </View>

                {/* Address */}
                <View className="w-full">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="home-outline" size={12} color="#75777D" />
                    <Text className="font-inter text-[10px] text-[#75777D]">Address</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs text-[#0D1B2A] leading-relaxed">
                    {profile.address || "—"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 2. Marks Tab */}
          {activeTab === "marks" && (
            <View className="bg-white rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm">
              <View className="p-5 flex-row justify-between items-center border-b border-gray-100">
                <Text className="font-poppins-bold text-base text-[#0D1B2A]">Current Term Marks</Text>
                <Ionicons name="journal-outline" size={18} color="#C9A84C" />
              </View>

              {loadingMarks ? (
                <ActivityIndicator size="small" color="#C9A84C" className="my-10" />
              ) : (
                <View>
                  {/* Table Header */}
                  <View className="flex-row bg-[#FDF9F1] px-5 py-2.5">
                    <Text className="flex-[2] font-poppins-bold text-[9px] text-[#75777D] uppercase">Subject</Text>
                    <Text className="flex-1 text-center font-poppins-bold text-[9px] text-[#75777D] uppercase">Max</Text>
                    <Text className="flex-1 text-center font-poppins-bold text-[9px] text-[#75777D] uppercase">Obt.</Text>
                    <Text className="flex-1 text-right font-poppins-bold text-[9px] text-[#75777D] uppercase">Grade</Text>
                  </View>

                  {/* Table Rows */}
                  {marks.map((m, idx) => (
                    <View
                      key={m.subject_id}
                      className={`flex-row px-5 py-3.5 border-b border-gray-100 last:border-b-0 ${
                        idx % 2 === 0 ? "bg-white" : "bg-[#F7F3E8]/30"
                      }`}
                    >
                      <Text className="flex-[2] font-poppins-bold text-xs text-[#0D1B2A]">{m.subject_name}</Text>
                      <Text className="flex-1 text-center font-inter text-xs text-[#75777D]">{m.max_marks}</Text>
                      <Text className="flex-1 text-center font-poppins-semibold text-xs text-[#0D1B2A]">
                        {m.marks_obtained !== null ? m.marks_obtained : "Absent"}
                      </Text>
                      <Text className="flex-1 text-right font-poppins-bold text-xs text-[#C9A84C]">
                        {m.grade || "—"}
                      </Text>
                    </View>
                  ))}

                  {/* Total Row */}
                  <View className="flex-row bg-[#0D1B2A] px-5 py-4 items-center">
                    <Text className="flex-[2] font-poppins-bold text-xs text-[#ffe088]">Total Aggregate</Text>
                    <Text className="flex-1 text-center font-inter text-xs text-gray-300">{totalMax}</Text>
                    <Text className="flex-1 text-center font-poppins-semibold text-xs text-white">{totalObt}</Text>
                    <Text className="flex-1 text-right font-poppins-bold text-xs text-[#ffe088]">{aggregatePct}%</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 3. Previous Results Tab */}
          {activeTab === "results" && (
            <View className="space-y-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-poppins-bold text-base text-[#0D1B2A]">Previous Academic Results</Text>
                <Ionicons name="ribbon-outline" size={18} color="#C9A84C" />
              </View>

              {loadingResults ? (
                <ActivityIndicator size="small" color="#C9A84C" className="my-10" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-5 px-5">
                  {results.map((res) => (
                    <View
                      key={res.id}
                      className="min-w-[130px] bg-white rounded-2xl p-4 mr-3 border border-gray-200/60 shadow-sm items-center justify-center"
                    >
                      <Text className="font-poppins-semibold text-[10px] text-[#75777D] uppercase tracking-wider">
                        {res.class_name}
                      </Text>
                      <Text className="font-poppins-bold text-base text-[#0D1B2A] mt-1.5">
                        {res.percentage}
                      </Text>
                      <View className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
                        <Text className="font-poppins-bold text-[9px] text-[#2E7D32]">
                          {res.status}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* 4. AI Score Tab */}
          {activeTab === "ai-score" && (
            <View className="bg-[#0D1B2A] rounded-3xl p-5 border border-gray-800 shadow-lg">
              {/* Header and Filter */}
              <View className="flex-row justify-between items-start mb-5">
                <View>
                  <Text className="font-poppins-bold text-[#ffe088] text-sm flex-row items-center">
                    <Ionicons name="sparkles" size={12} color="#ffe088" className="mr-1" />
                    AI Academic Score
                  </Text>
                  <Text className="font-inter text-[9.5px] text-gray-400 mt-0.5">
                    Predictive performance analysis
                  </Text>
                </View>

                {/* Filter Selector */}
                <View className="flex-row bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                  {(["this_term", "this_year", "all_time"] as const).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setAiFilter(filter)}
                      className={`px-2.5 py-1.5 rounded-md ${
                        aiFilter === filter ? "bg-[#C9A84C]" : "bg-transparent"
                      }`}
                    >
                      <Text
                        className={`font-poppins-bold text-[8.5px] uppercase tracking-wider ${
                          aiFilter === filter ? "text-[#0D1B2A]" : "text-gray-400"
                        }`}
                      >
                        {filter === "this_term" ? "Term" : filter === "this_year" ? "Year" : "All"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {loadingAi ? (
                <ActivityIndicator size="small" color="#ffe088" className="my-10" />
              ) : aiSummary ? (
                <View>
                  {/* Current Score Block */}
                  <View className="flex-row items-end justify-between mb-4">
                    <View>
                      <Text className="font-poppins-bold text-3xl text-[#ffe088]">
                        {aiSummary.current}
                      </Text>
                      <Text className="font-inter text-[9.5px] text-gray-400 mt-0.5">
                        Current Score Projection
                      </Text>
                    </View>

                    {selectedPointIdx !== null && aiSummary.history[selectedPointIdx] && (
                      <View className="items-end bg-slate-800/40 border border-slate-700 px-3 py-1 rounded-xl">
                        <Text className="font-poppins-bold text-[10px] text-white">
                          Score: {aiSummary.history[selectedPointIdx].score}
                        </Text>
                        <Text className="font-inter text-[8.5px] text-gray-400">
                          {aiSummary.history[selectedPointIdx].date}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* SVG Chart */}
                  {renderLineChart(aiSummary.history)}

                  {/* Footer Stats */}
                  <View className="mt-4 pt-3.5 border-t border-gray-800 flex-row justify-between items-center">
                    <View className="flex-row items-center space-x-1">
                      <Ionicons
                        name={aiSummary.isPositive ? "trending-up" : "trending-down"}
                        size={14}
                        color={aiSummary.isPositive ? "#4CAF50" : "#F44336"}
                      />
                      <Text
                        className={`font-inter-medium text-[10px] ${
                          aiSummary.isPositive ? "text-[#4CAF50]" : "text-[#F44336]"
                        }`}
                      >
                        {aiSummary.trend} from last month
                      </Text>
                    </View>
                    <Text className="font-inter text-[9.5px] text-[#ffe088] underline">
                      View full analytics report
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* 5. More Tab */}
          {activeTab === "more" && (
            <View className="space-y-4">
              {/* Attendance Card */}
              <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-poppins-bold text-sm text-[#0D1B2A]">Attendance Analytics</Text>
                  <Ionicons name="calendar-outline" size={16} color="#C9A84C" />
                </View>
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="font-poppins-bold text-2xl text-[#2E7D32]">94.2%</Text>
                    <Text className="font-inter text-[10px] text-[#75777D] mt-0.5">Average Attendance</Text>
                  </View>
                  <View className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <View className="h-full bg-[#2E7D32] rounded-full" style={{ width: "94.2%" }} />
                  </View>
                </View>
              </View>

              {/* Fee Checklist Card */}
              <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-poppins-bold text-sm text-[#0D1B2A]">Fee Status Checklist</Text>
                  <Ionicons name="card-outline" size={16} color="#C9A84C" />
                </View>
                <View className="space-y-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-inter text-xs text-[#0D1B2A]">Tuition Fee (Term 1 & 2)</Text>
                    <View className="bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded">
                      <Text className="font-poppins-bold text-[8.5px] text-[#2E7D32]">PAID</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-inter text-xs text-[#0D1B2A]">Examination Fees</Text>
                    <View className="bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded">
                      <Text className="font-poppins-bold text-[8.5px] text-[#2E7D32]">PAID</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-inter text-xs text-[#0D1B2A]">Transport Fees (Q2)</Text>
                    <View className="bg-amber-50 px-2 py-0.5 border border-amber-100 rounded">
                      <Text className="font-poppins-bold text-[8.5px] text-[#D4AF37]">PENDING</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Document checklist Card */}
              <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-poppins-bold text-sm text-[#0D1B2A]">Document Checklist</Text>
                  <Ionicons name="document-text-outline" size={16} color="#C9A84C" />
                </View>
                <View className="space-y-2.5">
                  <View className="flex-row items-center space-x-2">
                    <Ionicons name="checkbox" size={16} color="#C9A84C" />
                    <Text className="font-inter text-xs text-[#0D1B2A]">Aadhaar Card Copy</Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <Ionicons name="checkbox" size={16} color="#C9A84C" />
                    <Text className="font-inter text-xs text-[#0D1B2A]">Transfer Certificate</Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <Ionicons name="square-outline" size={16} color="#75777D" />
                    <Text className="font-inter text-xs text-[#75777D]">Previous Class Report Card</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="academics" />
    </SafeAreaView>
  );
}
