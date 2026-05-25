import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { useAuth } from "../../src/hooks/useAuth";
import { useQuery } from "../../src/hooks/useQuery";
import { getDashboardMetrics } from "../../src/repositories/metricRepository";
import { getCirculars } from "../../src/repositories/circularRepository";
import { getFeeCollectionSummary } from "../../src/repositories/feeRepository";
import { supabase } from "../../src/lib/supabase";
import { getStudentAttendanceSummary, getInstitutionSections, resolveStudentAcademicYear } from "../../src/repositories/attendanceRepository";

export default function InstitutionDashboard() {
  const router = useRouter();
  const { institutionId } = useAuth();

  const { data: metrics, isLoading: loadingMetrics } = useQuery(
    () => getDashboardMetrics(institutionId || ""),
    [institutionId]
  );

  const { data: circulars, isLoading: loadingCirculars } = useQuery(
    () => getCirculars(institutionId || ""),
    [institutionId]
  );

  // Fetch the academic year ID for "2026-27"
  const { data: academicYearId } = useQuery(async () => {
    if (!institutionId) return "";
    const { data: ay } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("label", "2026-27")
      .maybeSingle();

    if (ay) return ay.id;

    const { data: ayCurrent } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .maybeSingle();

    return ayCurrent?.id || "";
  }, [institutionId]);

  // Fetch real fee collection rate summary
  const { data: feeSummary, isLoading: loadingFee } = useQuery(
    async () => {
      if (!institutionId || !academicYearId) {
        return { totalCollected: 0, totalTarget: 0, completionPercent: 0 };
      }
      return getFeeCollectionSummary(institutionId, academicYearId);
    },
    [institutionId, academicYearId]
  );

  // Fetch sections to get the first one for attendance
  const { data: sectionsData } = useQuery(
    async () => {
      if (!institutionId) return [];
      return getInstitutionSections(institutionId);
    },
    [institutionId]
  );

  const firstSectionId = sectionsData && sectionsData.length > 0 ? sectionsData[0].id : "";

  // Fetch real student attendance summary for May 2026
  const { data: attendanceSummary, isLoading: loadingAttendance } = useQuery(
    async () => {
      if (!institutionId || !firstSectionId) return null;
      const resolvedAY = await resolveStudentAcademicYear(institutionId, firstSectionId, 5, 2026);
      if (!resolvedAY) return null;
      return getStudentAttendanceSummary(institutionId, firstSectionId, resolvedAY.id, resolvedAY.resolvedYear, 5);
    },
    [institutionId, firstSectionId]
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const feeRateString = feeSummary
    ? `${feeSummary.completionPercent.toFixed(1)}%`
    : "0.0%";

  const displayMetrics = [
    { id: "1", title: "Total Students", value: metrics?.totalStudents ?? 0, change: metrics?.studentsChange ?? "+24 this month", isPositive: true, icon: "people-outline" },
    { id: "2", title: "Total Teachers", value: metrics?.totalTeachers ?? 0, change: metrics?.teachersChange ?? "+2 this term", isPositive: true, icon: "school-outline" },
    { id: "3", title: "Fee Collection Rate", value: loadingFee ? "..." : feeRateString, change: "Term 1 · 2026-27", isPositive: true, icon: "cash-outline" },
    { id: "4", title: "Student Attendance", value: loadingAttendance ? "..." : (attendanceSummary ? `${attendanceSummary.monthlyAvg}%` : "94.2%"), change: "May 2026", isPositive: true, icon: "calendar-outline" },
  ];

  const recentCirculars = circulars?.slice(0, 3) || [];

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      {/* Custom Header */}
      <Header title="Dashboard" showBackButton={true} />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Welcome Block */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-[11px] font-poppins-semibold text-[#735c00] tracking-widest uppercase mb-1">
            Academic Session 2026-27
          </Text>
          <Text className="text-2xl font-poppins-bold text-[#0F1C2C] leading-tight">
            Administrator Portal
          </Text>
          <Text className="text-xs font-inter text-neutral-steel mt-1">
            {today}
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="px-5 mb-6">
          {loadingMetrics ? (
            <View className="py-10 justify-center items-center">
              <ActivityIndicator size="small" color="#FF5E00" />
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {displayMetrics.map((metric) => {
                const isStudents = metric.title === "Total Students";
                const isTeachers = metric.title === "Total Teachers";
                const isFees = metric.title === "Fee Collection Rate";
                const isAttendance = metric.title === "Student Attendance";
                const isClickable = isStudents || isTeachers || isFees || isAttendance;
                return (
                  <View key={metric.id} className="w-1/2 px-2 mb-4">
                    <TouchableOpacity
                      activeOpacity={isClickable ? 0.7 : 1}
                      disabled={!isClickable}
                      onPress={() => {
                        if (isStudents) router.push("/students" as any);
                        if (isTeachers) router.push("/teachers" as any);
                        if (isFees) router.push("/institution/fees" as any);
                        if (isAttendance) router.push("/institution/attendance" as any);
                      }}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
                    >
                      <View className="w-8 h-8 rounded-lg bg-[#0F1C2C]/5 items-center justify-center mb-3">
                        <Ionicons name={metric.icon as any} size={18} color="#0F1C2C" />
                      </View>
                      <Text className="text-neutral-steel font-inter text-[11px]">
                        {metric.title}
                      </Text>
                      <Text className="text-[#0F1C2C] font-poppins-bold text-lg mt-1">
                        {metric.value}
                      </Text>
                      <Text className="text-emerald-600 font-inter text-[10px] mt-1 font-semibold">
                        {metric.change}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Quick Actions (Bento Style) */}
        <View className="px-5 mb-6">
          <Text className="text-[#0F1C2C] font-poppins-bold text-base mb-3 px-1">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {/* Add Student */}
            <TouchableOpacity
              onPress={() => router.push("/institution/register?type=student" as any)}
              className="w-[48.5%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm mb-3"
            >
              <Ionicons name="person-add-outline" size={20} color="#735c00" />
              <Text className="text-[#0F1C2C] font-poppins-semibold text-xs mt-2">
                Add Student
              </Text>
              <Text className="text-[10px] text-neutral-steel mt-0.5">
                Register candidate info
              </Text>
            </TouchableOpacity>

            {/* Add Teacher */}
            <TouchableOpacity
              onPress={() => router.push("/institution/register?type=teacher" as any)}
              className="w-[48.5%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm mb-3"
            >
              <Ionicons name="people-outline" size={20} color="#735c00" />
              <Text className="text-[#0F1C2C] font-poppins-semibold text-xs mt-2">
                Add Teacher
              </Text>
              <Text className="text-[10px] text-neutral-steel mt-0.5">
                Appoint new faculty
              </Text>
            </TouchableOpacity>

            {/* Compose Circular */}
            <TouchableOpacity
              onPress={() => router.push("/institution/circulars" as any)}
              className="w-[48.5%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm mb-3"
            >
              <Ionicons name="megaphone-outline" size={20} color="#735c00" />
              <Text className="text-[#0F1C2C] font-poppins-semibold text-xs mt-2">
                Send Notice
              </Text>
              <Text className="text-[10px] text-neutral-steel mt-0.5">
                Broadcast announcements
              </Text>
            </TouchableOpacity>

            {/* Schedule Event */}
            <TouchableOpacity
              onPress={() => router.push("/institution/events" as any)}
              className="w-[48.5%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm mb-3"
            >
              <Ionicons name="calendar-outline" size={20} color="#735c00" />
              <Text className="text-[#0F1C2C] font-poppins-semibold text-xs mt-2">
                Schedule Event
              </Text>
              <Text className="text-[10px] text-neutral-steel mt-0.5">
                Update school calendar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Growth & Daily Alerts */}
        <View className="px-5 mb-6">
          <View className="bg-[#0F1C2C] rounded-3xl p-5 border-2 border-[#ffe088]/40 shadow-md">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-poppins-bold text-sm">
                System Updates & Alerts
              </Text>
              <View className="bg-[#ffe088] px-2 py-0.5 rounded-full">
                <Text className="text-[#0F1C2C] font-opensans font-bold text-[8px] uppercase tracking-wider">
                  Live
                </Text>
              </View>
            </View>

            {loadingCirculars ? (
              <ActivityIndicator size="small" color="#ffe088" className="my-6" />
            ) : recentCirculars.length === 0 ? (
              <Text className="text-gray-400 text-xs font-inter italic text-center py-4">No recent notice broadcasts.</Text>
            ) : (
              <View className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                {recentCirculars.map((circular) => (
                  <View key={circular.id} className="flex-row items-start space-x-3 mb-2">
                    <View className="mt-0.5">
                      <Ionicons
                        name="ellipse"
                        size={8}
                        color={circular.category === "Urgent" ? "#EF4444" : "#ffe088"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-inter-medium text-xs">
                        {circular.title}
                      </Text>
                      <Text className="text-slate-400 font-inter text-[9px] mt-0.5">
                        Posted: {circular.date} • For: {circular.audience}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Custom Bottom Navbar */}
      <BottomNavBar activeTab="home" />
    </SafeAreaView>
  );
}
