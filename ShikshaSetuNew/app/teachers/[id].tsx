import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  Alert,
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
  getTeacherProfile,
  getTeacherPerformance,
  getTeacherClasses,
  assignClassToTeacher,
  removeClassFromTeacher,
  getAllSections,
  getSubjects,
  getClassPerformanceCardData,
} from "@/src/repositories/teacherRepository";
import {
  TeacherProfile,
  TeacherPerformanceSummary,
  TeacherClass,
  AIScoreHistoryPoint,
} from "@/src/types/teacher";

type TabName = "personal" | "performance" | "classes" | "management";

export default function TeacherProfileScreen() {
  const router = useRouter();
  const { id: teacherId } = useLocalSearchParams<{ id: string }>();
  const { isLoaded, isSignedIn, role, institutionId, theme } = useAuth();

  const primaryColor = theme?.colors?.primary ?? '#0D1B2A';
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37';
  const secondaryLightColor = theme?.colors?.secondaryLight ?? '#F2C14E';
  const creamColor = theme?.colors?.cream ?? '#F7F3EB';
  const steelGrayColor = theme?.colors?.steelGray ?? '#6B7280';
  const primaryAltColor = theme?.colors?.primaryAlt ?? '#162A56';
  
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<TabName>("personal");
  const [performanceFilter, setPerformanceFilter] = useState<"this_term" | "this_year" | "all_time">("this_term");

  // Core Data States
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Lazy Loaded Data States
  const [performance, setPerformance] = useState<TeacherPerformanceSummary | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [classPerformanceCard, setClassPerformanceCard] = useState<{
    class_name: string;
    section_name: string;
    subjectMetrics: { subject_name: string; avgMarks: number }[];
  } | null>(null);

  // Management Assignment Modal States
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [availableSections, setAvailableSections] = useState<{ id: string; class_name: string; section_name: string }[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Selector drop-downs within modal
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  // Chart interactivity state
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);

  // 1. Fetch Core Profile on Load
  useEffect(() => {
    if (!teacherId) return;

    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const data = await getTeacherProfile(teacherId!);
        setProfile(data);
      } catch (err) {
        console.error("Error loading teacher profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [teacherId]);

  // 2. Lazy Data Fetching when tabs are clicked
  useEffect(() => {
    if (!teacherId) return;

    if (activeTab === "performance") {
      setLoadingPerformance(true);
      getTeacherPerformance(teacherId, performanceFilter)
        .then((summary) => {
          setPerformance(summary);
          // Default select the latest score point
          if (summary.aiScoreHistory.length > 0) {
            setSelectedPointIdx(summary.aiScoreHistory.length - 1);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingPerformance(false));
    }

    if (activeTab === "classes" || activeTab === "management") {
      setLoadingClasses(true);
      getTeacherClasses(teacherId)
        .then(setClasses)
        .catch(console.error)
        .finally(() => setLoadingClasses(false));
        
      if (activeTab === "classes") {
        getClassPerformanceCardData(teacherId)
          .then(setClassPerformanceCard)
          .catch(console.error);
      }
    }
  }, [teacherId, activeTab, performanceFilter]);

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

  // Fetch sections and subjects for selector on modal open
  const handleOpenAssignModal = async () => {
    if (!institutionId) return;
    setAssignModalOpen(true);
    setSelectedSectionId("");
    setSelectedSubjectId("");
    try {
      const [secs, subs] = await Promise.all([
        getAllSections(institutionId),
        getSubjects(institutionId)
      ]);
      setAvailableSections(secs);
      setAvailableSubjects(subs);
    } catch (err) {
      console.error("Failed to load options for assignment modal:", err);
    }
  };

  // Assign Class Handler
  const handleConfirmAssignment = async () => {
    if (!selectedSectionId || !selectedSubjectId || !teacherId) {
      Alert.alert("Error", "Please select both a class and a subject.");
      return;
    }

    setIsAssigning(true);
    const success = await assignClassToTeacher(teacherId, selectedSectionId, selectedSubjectId);
    setIsAssigning(false);

    if (success) {
      setAssignModalOpen(false);
      // Reload classes
      setLoadingClasses(true);
      getTeacherClasses(teacherId)
        .then(setClasses)
        .catch(console.error)
        .finally(() => setLoadingClasses(false));
      Alert.alert("Success", "Class assigned successfully.");
    } else {
      Alert.alert("Error", "Failed to assign class. It might already be assigned.");
    }
  };

  // Remove Class Handler
  const handleRemoveAssignment = (sectionId: string, subjectId: string, className: string, sectionName: string, subjectName: string) => {
    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to remove ${className}-${sectionName} (${subjectName}) from this teacher?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setLoadingClasses(true);
            const success = await removeClassFromTeacher(teacherId!, sectionId, subjectId);
            if (success) {
              const updated = await getTeacherClasses(teacherId!);
              setClasses(updated);
              Alert.alert("Removed", "Class assignment removed successfully.");
            } else {
              Alert.alert("Error", "Failed to remove assignment.");
            }
            setLoadingClasses(false);
          }
        }
      ]
    );
  };

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

    const minScore = 50; 
    const maxScore = 100;

    const xStep = (chartWidth - paddingLeft - paddingRight) / Math.max(1, history.length - 1);

    // Compute coordinates
    const points = history.map((pt, idx) => {
      const x = paddingLeft + idx * xStep;
      const pct = (pt.score - minScore) / (maxScore - minScore);
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

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`;

    return (
      <View className="items-center">
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="tealGoldGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={primaryAltColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={secondaryColor} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={primaryAltColor} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={primaryAltColor} stopOpacity="0.0" />
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
                fill={isSelected ? secondaryColor : primaryAltColor}
                stroke="white"
                strokeWidth={isSelected ? 2.5 : 1.5}
                onPress={() => setSelectedPointIdx(idx)}
              />
            );
          })}

          {/* X Axis dates */}
          {points.map((pt, idx) => {
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
                fill={steelGrayColor}
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
      <SafeAreaView className="flex-grow flex-1 justify-center items-center" style={{ backgroundColor: creamColor }}>
        <ActivityIndicator size="large" color={secondaryColor} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-grow flex-1 justify-center items-center" style={{ backgroundColor: creamColor }}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text className="font-poppins-bold text-sm mt-3" style={{ color: primaryColor }}>Teacher profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-2 rounded-xl" style={{ backgroundColor: secondaryColor }}>
          <Text className="text-white font-poppins-semibold text-xs">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Calculate aggregates for Subject Metrics
  const metricsCount = performance?.subjectMetrics.length || 0;
  const avgMarksSum = performance?.subjectMetrics.reduce((acc, m) => acc + m.avgMarks, 0) || 0;
  const avgMarksCumulative = metricsCount > 0 ? Math.round(avgMarksSum / metricsCount) : 80;

  const avgAiSum = performance?.subjectMetrics.reduce((acc, m) => acc + m.aiScore, 0) || 0;
  const avgAiCumulative = metricsCount > 0 ? (avgAiSum / metricsCount).toFixed(1) : "8.0";

  // Check if they are class teacher
  const classTeacherClass = classes.find(c => c.isClassTeacher);

  return (
    <SafeAreaView className="flex-grow flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="Teacher Profile" showBackButton={true} onBackPress={() => router.push("/teachers" as any)} />

      <ScrollView className="flex-grow" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Banner Section */}
        <View className="items-center mt-6 mb-6">
          <View className="relative">
            <View className="w-28 h-28 rounded-full border-4 border-white shadow-lg flex-row items-center justify-center" style={{ backgroundColor: secondaryLightColor }}>
              <Text className="font-poppins-bold text-2xl" style={{ color: primaryColor }}>
                {getInitials(profile.full_name)}
              </Text>
            </View>
            <View className="absolute bottom-0.5 right-0.5 bg-white p-1 rounded-full shadow-md">
              <Ionicons
                name={profile.status === "Active" ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={profile.status === "Active" ? "#2E7D32" : steelGrayColor}
              />
            </View>
          </View>
          <Text className="font-poppins-bold text-xl mt-3" style={{ color: primaryColor }}>
            {profile.full_name}
          </Text>
          <View className="flex-row items-center space-x-2 mt-1.5">
            <Text className="font-poppins-semibold text-[10px] uppercase tracking-wider" style={{ color: steelGrayColor }}>
              {profile.specialization}
            </Text>
            <Text className="font-poppins text-[10px]" style={{ color: steelGrayColor }}>|</Text>
            <Text className="font-poppins-semibold text-[10px] uppercase tracking-wider" style={{ color: steelGrayColor }}>
              Code: {profile.employee_code}
            </Text>
            <Text className="font-poppins text-[10px]" style={{ color: steelGrayColor }}>|</Text>
            <View className="flex-row items-center space-x-1">
              <View className={`w-2.5 h-2.5 rounded-full ${profile.status === "Active" ? "bg-[#2E7D32]" : "bg-neutral-400"}`} />
              <Text className="font-poppins-semibold text-[10px] uppercase tracking-wider" style={{ color: profile.status === "Active" ? "#2E7D32" : steelGrayColor }}>
                {profile.status}
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
            {([
              { id: "personal", label: "Personal" },
              { id: "performance", label: "Performance" },
              { id: "classes", label: "Classes" },
              { id: "management", label: "Management" }
            ] as const).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className="mr-4 pb-2 px-1 border-b-2"
                style={{ borderBottomColor: activeTab === tab.id ? secondaryColor : "transparent" }}
              >
                <Text
                  className="font-poppins-bold text-[11px] uppercase tracking-widest"
                  style={{ color: activeTab === tab.id ? primaryColor : steelGrayColor }}
                >
                  {tab.label}
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
                <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>Personal Details</Text>
                <Ionicons name="person-outline" size={18} color={secondaryColor} />
              </View>

              <View className="flex-row flex-wrap">
                {/* Employee Code */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="card-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Employee Code</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                    {profile.employee_code}
                  </Text>
                </View>

                {/* Status */}
                <View className="w-1/2 mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="radio-button-on" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Status</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                    {profile.status}
                  </Text>
                </View>

                {/* Email */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="mail-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Email</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }} numberOfLines={1}>
                    {profile.email || "—"}
                  </Text>
                </View>

                {/* Phone */}
                <View className="w-1/2 mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="call-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Phone</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                    {profile.phone || "—"}
                  </Text>
                </View>

                {/* Date of Birth */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="calendar-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>DOB</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
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
                    <Ionicons name="male-female-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Gender</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs capitalize" style={{ color: primaryColor }}>
                    {profile.gender || "—"}
                  </Text>
                </View>

                {/* Qualification */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="school-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Qualification</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }} numberOfLines={1}>
                    {profile.qualification || "—"}
                  </Text>
                </View>

                {/* Specialization */}
                <View className="w-1/2 mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="star-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Specialization</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }} numberOfLines={1}>
                    {profile.specialization || "—"}
                  </Text>
                </View>

                {/* Date of Joining */}
                <View className="w-1/2 mb-4 pr-2">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="time-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Date of Joining</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                    {profile.date_of_joining
                      ? new Date(profile.date_of_joining).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </Text>
                </View>

                {/* Last Login At */}
                <View className="w-1/2 mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="log-in-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Last Login</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                    {profile.last_login_at
                      ? new Date(profile.last_login_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric"
                        })
                      : "—"}
                  </Text>
                </View>

                {/* Address */}
                <View className="w-full mb-4">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="home-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Address</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs leading-relaxed" style={{ color: primaryColor }}>
                    {profile.address || "—"}
                  </Text>
                </View>

                {/* Emergency Contact */}
                <View className="w-full">
                  <View className="flex-row items-center space-x-1.5 mb-0.5">
                    <Ionicons name="alert-circle-outline" size={12} color={steelGrayColor} />
                    <Text className="font-inter text-[10px]" style={{ color: steelGrayColor }}>Emergency Contact</Text>
                  </View>
                  <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                    {profile.emergency_contact || "—"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 2. Performance Tab */}
          {activeTab === "performance" && (
            <View className="space-y-4">
              
              {/* Overall Index Score */}
              {loadingPerformance ? (
                <ActivityIndicator size="small" color={secondaryColor} className="my-10" />
              ) : performance ? (
                <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm flex-row justify-between items-center">
                  <View>
                    <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }}>Performance Index</Text>
                    <Text className="font-inter text-[10px] mt-0.5" style={{ color: steelGrayColor }}>Cumulative teacher rating</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-poppins-bold text-3xl" style={{ color: secondaryColor }}>
                      {performance.overallScore}%
                    </Text>
                    <View className="flex-row items-center space-x-1 mt-0.5">
                      <Ionicons name="trending-up" size={12} color="#2E7D32" />
                      <Text className="font-inter-semibold text-[10px] text-[#2E7D32]">+1.8% vs last term</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Subject Metrics Table */}
              {performance && (
                <View className="bg-white rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm">
                  <View className="p-5 flex-row justify-between items-center border-b border-gray-100">
                    <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>Academic Metrics</Text>
                    <Ionicons name="journal-outline" size={18} color={secondaryColor} />
                  </View>

                  {/* Table Header */}
                  <View className="flex-row bg-[#FDF9F1] px-5 py-2.5">
                    <Text className="flex-[1.5] font-poppins-bold text-[9px] uppercase" style={{ color: steelGrayColor }}>Subject</Text>
                    <Text className="flex-[1.2] font-poppins-bold text-[9px] uppercase text-center" style={{ color: steelGrayColor }}>Class</Text>
                    <Text className="flex-1 font-poppins-bold text-[9px] uppercase text-center" style={{ color: steelGrayColor }}>Avg Marks</Text>
                    <Text className="flex-1 font-poppins-bold text-[9px] uppercase text-right" style={{ color: steelGrayColor }}>AI Score</Text>
                  </View>

                  {/* Table Rows */}
                  {performance.subjectMetrics.length === 0 ? (
                    <View className="py-8 justify-center items-center">
                      <Text className="font-inter text-xs italic" style={{ color: steelGrayColor }}>No active subject marks found.</Text>
                    </View>
                  ) : (
                    performance.subjectMetrics.map((m, idx) => (
                      <View
                        key={`${m.class}_${m.subject}`}
                        className="flex-row px-5 py-3.5 border-b border-gray-100 last:border-b-0"
                        style={{ backgroundColor: idx % 2 === 0 ? "white" : creamColor + "4D" }}
                      >
                        <Text className="flex-[1.5] font-poppins-bold text-xs" style={{ color: primaryColor }}>{m.subject}</Text>
                        <Text className="flex-[1.2] text-center font-inter text-xs" style={{ color: steelGrayColor }}>{m.class}</Text>
                        <Text className="flex-1 text-center font-poppins-semibold text-xs" style={{ color: primaryColor }}>{m.avgMarks}%</Text>
                        <Text className="flex-1 text-right font-poppins-bold text-xs" style={{ color: primaryAltColor }}>{m.aiScore}</Text>
                      </View>
                    ))
                  )}

                  {/* Total Cumulative Row */}
                  {performance.subjectMetrics.length > 0 && (
                    <View className="flex-row px-5 py-4 items-center" style={{ backgroundColor: secondaryColor }}>
                      <Text className="flex-[2.7] font-poppins-bold text-xs text-white">Cumulative Averages</Text>
                      <Text className="flex-1 text-center font-poppins-bold text-xs text-white">{avgMarksCumulative}%</Text>
                      <Text className="flex-1 text-right font-poppins-bold text-xs text-white">{avgAiCumulative}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Student AI Score Trend Line Chart */}
              {performance && (
                <View className="rounded-3xl p-5 border border-gray-800 shadow-lg" style={{ backgroundColor: primaryColor }}>
                  <View className="flex-row flex-wrap justify-between items-start mb-5 gap-2">
                    <View>
                      <Text className="font-poppins-bold text-sm flex-row items-center" style={{ color: secondaryLightColor }}>
                        <Ionicons name="sparkles" size={12} color={secondaryLightColor} className="mr-1" />
                        Student AI Score Trend
                      </Text>
                      <Text className="font-inter text-[9.5px] text-gray-400 mt-0.5">
                        Weighted monthly average of taught students
                      </Text>
                    </View>

                    {/* Filter Tabs */}
                    <View className="flex-row bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                      {(["this_term", "this_year", "all_time"] as const).map((filter) => (
                        <TouchableOpacity
                          key={filter}
                          onPress={() => setPerformanceFilter(filter)}
                          className="px-2 py-1 rounded-md"
                          style={performanceFilter === filter ? { backgroundColor: secondaryColor } : undefined}
                        >
                          <Text
                            className="font-poppins-bold text-[8px] uppercase tracking-wider"
                            style={{ color: performanceFilter === filter ? primaryColor : "#94A3B8" }}
                          >
                            {filter === "this_term" ? "Term" : filter === "this_year" ? "Year" : "All"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View className="flex-row items-end justify-between mb-4">
                    <View>
                      <Text className="font-poppins-bold text-2xl text-white">
                        {performance.aiScoreHistory.length > 0 && selectedPointIdx !== null && performance.aiScoreHistory[selectedPointIdx]
                          ? performance.aiScoreHistory[selectedPointIdx].score
                          : "—"}
                      </Text>
                      <Text className="font-inter text-[8.5px] text-gray-400 mt-0.5">
                        {performance.aiScoreHistory.length > 0 && selectedPointIdx !== null && performance.aiScoreHistory[selectedPointIdx]
                          ? `Calculated on ${performance.aiScoreHistory[selectedPointIdx].date}`
                          : "AI Projection Score"}
                      </Text>
                    </View>
                  </View>

                  {/* SVG Trend Chart */}
                  {renderLineChart(performance.aiScoreHistory)}
                </View>
              )}
            </View>
          )}

          {/* 3. Classes Tab */}
          {activeTab === "classes" && (
            <View className="space-y-4">
              
              {/* Class Teacher Badge (Gold border card) */}
              {classTeacherClass && (
                <View className="bg-white rounded-3xl p-5 shadow-md flex-row justify-between items-center border-2" style={{ borderColor: secondaryColor }}>
                  <View className="flex-1 pr-2">
                    <Text className="font-poppins-bold text-xs uppercase tracking-widest" style={{ color: secondaryColor }}>
                      Designated Class Teacher
                    </Text>
                    <Text className="font-poppins-bold text-lg mt-1" style={{ color: primaryColor }}>
                      {classTeacherClass.class_name}-{classTeacherClass.section_name}
                    </Text>
                    <Text className="font-inter text-[10px] mt-0.5" style={{ color: steelGrayColor }}>
                      Overseeing administrative and academic workflows
                    </Text>
                  </View>
                  <View className="w-12 h-12 rounded-full flex-row items-center justify-center border" style={{ backgroundColor: secondaryLightColor + "33", borderColor: secondaryColor + "80" }}>
                    <Ionicons name="ribbon" size={24} color={secondaryColor} />
                  </View>
                </View>
              )}

              {/* Class Performance Card (Hide completely if no class_teacher assignment) */}
              {classTeacherClass && classPerformanceCard && (
                <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm space-y-4">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>
                      Class Performance ({classPerformanceCard.class_name}-{classPerformanceCard.section_name})
                    </Text>
                    <Ionicons name="bar-chart-outline" size={18} color={secondaryColor} />
                  </View>

                  {classPerformanceCard.subjectMetrics.length === 0 ? (
                    <Text className="font-inter text-xs italic text-center py-4" style={{ color: steelGrayColor }}>No class subjects marks found.</Text>
                  ) : (
                    <View className="space-y-3">
                      {classPerformanceCard.subjectMetrics.map((sm, idx) => (
                        <View key={`${sm.subject_name}_${idx}`}>
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="font-poppins-bold text-xs" style={{ color: primaryColor }}>{sm.subject_name}</Text>
                            <Text className="font-poppins-semibold text-xs" style={{ color: secondaryColor }}>{sm.avgMarks}% Avg</Text>
                          </View>
                          {/* Progress bar */}
                          <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <View
                              className="h-full rounded-full"
                              style={{ width: `${sm.avgMarks}%`, backgroundColor: secondaryColor }}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* List of Taught Classes */}
              <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm space-y-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>Assigned Curriculum</Text>
                  <Ionicons name="book-outline" size={18} color={secondaryColor} />
                </View>

                {loadingClasses ? (
                  <ActivityIndicator size="small" color={secondaryColor} className="my-6" />
                ) : classes.length === 0 ? (
                  <Text className="font-inter text-xs italic text-center py-4" style={{ color: steelGrayColor }}>No class subjects currently assigned.</Text>
                ) : (
                  classes.map((cls, idx) => (
                    <View key={`${cls.section_id}_${cls.subject_id}_${idx}`} className="flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <View>
                        <Text className="font-poppins-bold text-xs" style={{ color: primaryColor }}>
                          {cls.class_name}-{cls.section_name}
                        </Text>
                        <Text className="font-inter text-[10px] text-gray-500 mt-0.5">
                          {cls.subject_name} • {cls.student_count} Students
                        </Text>
                      </View>
                      {cls.isClassTeacher && (
                        <View className="px-2 py-0.5 rounded border" style={{ backgroundColor: secondaryColor + "1A", borderColor: secondaryColor + "4D" }}>
                          <Text className="font-poppins-bold text-[8px] uppercase tracking-wider" style={{ color: secondaryColor }}>
                            Class Teacher
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* 4. Management Tab */}
          {activeTab === "management" && (
            <View className="space-y-4">
              
              {/* Assign Classes List */}
              <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm space-y-3">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>Class Assignments</Text>
                  <Ionicons name="construct-outline" size={18} color={secondaryColor} />
                </View>

                {loadingClasses ? (
                  <ActivityIndicator size="small" color={secondaryColor} className="my-6" />
                ) : classes.length === 0 ? (
                  <View className="py-6 justify-center items-center">
                    <Text className="font-inter text-xs italic text-center mb-2" style={{ color: steelGrayColor }}>No class subjects currently assigned.</Text>
                  </View>
                ) : (
                  classes.map((cls, idx) => (
                    <View key={`${cls.section_id}_${cls.subject_id}_${idx}`} className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <View className="flex-1 pr-2">
                        <Text className="font-poppins-bold text-xs" style={{ color: primaryColor }}>
                          {cls.class_name}-{cls.section_name}
                        </Text>
                        <Text className="font-inter text-[10px] text-gray-500 mt-0.5">
                          {cls.subject_name} • {cls.student_count} Students
                        </Text>
                      </View>
                      
                      {/* Remove Button */}
                      <TouchableOpacity
                        onPress={() => handleRemoveAssignment(cls.section_id, cls.subject_id, cls.class_name, cls.section_name, cls.subject_name)}
                        className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex-row items-center justify-center"
                      >
                        <Ionicons name="remove-circle-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {/* "+ Assign New Class" Gold Outlined Button */}
                <TouchableOpacity
                  onPress={handleOpenAssignModal}
                  className="mt-4 w-full py-3.5 border-2 border-dashed rounded-xl flex-row items-center justify-center space-x-2"
                  style={{ borderColor: secondaryColor }}
                >
                  <Ionicons name="add" size={18} color={secondaryColor} />
                  <Text className="font-poppins-bold text-xs uppercase tracking-wider" style={{ color: secondaryColor }}>
                    Assign New Class
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Assign Modal (Bottom sheet popup style) */}
      <Modal visible={assignModalOpen} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setAssignModalOpen(false)}>
          <View className="bg-white rounded-t-3xl max-h-[75%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>Assign New Class</Text>
              <TouchableOpacity onPress={() => setAssignModalOpen(false)}>
                <Ionicons name="close" size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-4" showsVerticalScrollIndicator={false}>
              {/* 1. Class Picker Selector */}
              <Text className="font-poppins-bold text-xs uppercase tracking-wider mb-1" style={{ color: steelGrayColor }}>
                Select Class & Section
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSectionPickerOpen(!sectionPickerOpen);
                  setSubjectPickerOpen(false);
                }}
                className="flex-row items-center justify-between px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl mb-3"
              >
                <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                  {selectedSectionId
                    ? `${availableSections.find(s => s.id === selectedSectionId)?.class_name}-${availableSections.find(s => s.id === selectedSectionId)?.section_name}`
                    : "Choose class..."}
                </Text>
                <Ionicons name={sectionPickerOpen ? "chevron-up" : "chevron-down"} size={14} color={primaryColor} />
              </TouchableOpacity>

              {sectionPickerOpen && (
                <View className="max-h-[160px] border border-gray-100 bg-white rounded-xl mb-3 overflow-hidden">
                  <ScrollView nestedScrollEnabled>
                    {availableSections.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          setSelectedSectionId(item.id);
                          setSectionPickerOpen(false);
                        }}
                        className="py-3 px-4 border-b border-gray-50 last:border-b-0"
                        style={selectedSectionId === item.id ? { backgroundColor: creamColor } : undefined}
                      >
                        <Text className="font-inter text-xs" style={{ color: primaryColor }}>
                          {item.class_name}-{item.section_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 2. Subject Picker Selector */}
              <Text className="font-poppins-bold text-xs uppercase tracking-wider mb-1" style={{ color: steelGrayColor }}>
                Select Subject
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSubjectPickerOpen(!subjectPickerOpen);
                  setSectionPickerOpen(false);
                }}
                className="flex-row items-center justify-between px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl mb-3"
              >
                <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                  {selectedSubjectId
                    ? availableSubjects.find(s => s.id === selectedSubjectId)?.name
                    : "Choose subject..."}
                </Text>
                <Ionicons name={subjectPickerOpen ? "chevron-up" : "chevron-down"} size={14} color={primaryColor} />
              </TouchableOpacity>

              {subjectPickerOpen && (
                <View className="max-h-[160px] border border-gray-100 bg-white rounded-xl mb-3 overflow-hidden">
                  <ScrollView nestedScrollEnabled>
                    {availableSubjects.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          setSelectedSubjectId(item.id);
                          setSubjectPickerOpen(false);
                        }}
                        className="py-3 px-4 border-b border-gray-50 last:border-b-0"
                        style={selectedSubjectId === item.id ? { backgroundColor: creamColor } : undefined}
                      >
                        <Text className="font-inter text-xs" style={{ color: primaryColor }}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 3. Confirm button */}
              <TouchableOpacity
                onPress={handleConfirmAssignment}
                disabled={isAssigning}
                className="mt-6 w-full py-4 rounded-xl flex-row items-center justify-center shadow-md"
                style={{ backgroundColor: secondaryColor }}
              >
                {isAssigning ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="font-poppins-bold text-xs text-white uppercase tracking-widest">
                    Confirm Assignment
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <BottomNavBar activeTab="academics" />
    </SafeAreaView>
  );
}
