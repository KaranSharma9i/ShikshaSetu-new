import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { useInstitutionAttendance } from "@/hooks/useInstitutionAttendance";
import { supabase } from "@/src/lib/supabase";
import {
  getStudentAttendanceSummary,
  getStudentAttendanceList,
  getStaffAttendanceSummary,
  getStaffAttendanceList,
  getDepartments,
  getInstitutionSections,
  StudentAttendanceListItem,
  StaffAttendanceListItem,
  CalendarDay,
  resolveStudentAcademicYear,
  resolveStaffAcademicYear,
} from "@/src/repositories/attendanceRepository";

type TabName = "student" | "staff" | "daily";

export default function AttendanceAnalysisScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, role, userId, institutionId, fullName } = useAuth();
  
  const {
    breakdown: dailyBreakdown,
    isLoading: isDailyLoading,
    error: dailyError,
    selectedDate: dailySelectedDate,
    setDate: setDailyDate,
    refetch: refetchDaily,
  } = useInstitutionAttendance("2026-05-25");

  // Helper to format YYYY-MM-DD to "Weekday, Month DD, YYYY"
  const formatDailyDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    const weekday = weekdays[dateObj.getDay()];
    const monthName = months[dateObj.getMonth()];
    return `${weekday}, ${monthName} ${day}, ${year}`;
  };

  // Helper to adjust the selected daily date by +/- days
  const adjustDailyDate = (days: number) => {
    if (!dailySelectedDate) return;
    const parts = dailySelectedDate.split("-");
    if (parts.length !== 3) return;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    dateObj.setDate(dateObj.getDate() + days);
    
    const newYear = dateObj.getFullYear();
    const newMonth = String(dateObj.getMonth() + 1).padStart(2, "0");
    const newDay = String(dateObj.getDate()).padStart(2, "0");
    setDailyDate(`${newYear}-${newMonth}-${newDay}`);
  };

  const filteredDailyBreakdown = (dailyBreakdown || []).filter((item) => {
    const searchLower = searchVal.trim().toLowerCase();
    if (!searchLower) return true;
    return (
      item.className.toLowerCase().includes(searchLower) ||
      item.sectionName.toLowerCase().includes(searchLower)
    );
  });

  // Navigation and Selection States
  const [activeTab, setActiveTab] = useState<TabName>("student");
  const [currentMonth, setCurrentMonth] = useState(5); // Default: May
  const [currentYear, setCurrentYear] = useState(2026); // Default: 2026
  
  // Section and Department chips
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("All");

  // Search filter
  const [searchVal, setSearchVal] = useState("");

  // Data States
  const [studentSummary, setStudentSummary] = useState<{
    monthlyAvg: number;
    criticalDays: number;
    calendarData: CalendarDay[];
    insight: string;
    resolvedYear: number;
  } | null>(null);
  const [studentList, setStudentList] = useState<StudentAttendanceListItem[]>([]);

  const [staffSummary, setStaffSummary] = useState<{
    monthlyAvg: number;
    staffOnLeaveToday: number;
    calendarData: CalendarDay[];
    insight: string;
    resolvedYear: number;
  } | null>(null);
  const [staffList, setStaffList] = useState<StaffAttendanceListItem[]>([]);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Teacher/Admin profile avatar state
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // 1. Protection & Auth Guard check
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.replace("/onboarding");
      } else if (role !== "institution_admin" && role !== "teacher") {
        router.replace("/");
      }
    }
  }, [isLoaded, isSignedIn, role]);

  // 2. Fetch User Profile photo for avatar
  useEffect(() => {
    if (userId) {
      supabase
        .from("users")
        .select("profile_photo_url")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.profile_photo_url) {
            setProfilePhoto(data.profile_photo_url);
          }
        });
    }
  }, [userId]);

  // 3. Fetch initial filter options (Sections for student, Departments for staff)
  useEffect(() => {
    if (!institutionId) return;

    async function loadFilterOptions() {
      try {
        const sectionsData = await getInstitutionSections(institutionId!);
        setSections(sectionsData);
        if (sectionsData.length > 0) {
          setSelectedSectionId(sectionsData[0].id);
        }

        const deptData = await getDepartments(institutionId!);
        setDepartments(deptData);
      } catch (err) {
        console.error("Failed to load initial chip selectors:", err);
      }
    }

    loadFilterOptions();
  }, [institutionId]);

  // 4. Fetch Attendance Data based on active state (Tab, Month, Selection)
  const loadAttendanceData = async (activeCheck?: { active: boolean }) => {
    if (!institutionId) return;
    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === "student") {
        if (!selectedSectionId) {
          setIsLoading(false);
          return;
        }
        
        const resolvedAY = await resolveStudentAcademicYear(
          institutionId!,
          selectedSectionId,
          currentMonth,
          currentYear
        );

        if (!resolvedAY) {
          if (activeCheck && !activeCheck.active) return;
          setError("Academic year details not found.");
          setIsLoading(false);
          return;
        }

        const summary = await getStudentAttendanceSummary(
          institutionId!,
          selectedSectionId,
          resolvedAY.id,
          resolvedAY.resolvedYear,
          currentMonth
        );
        const list = await getStudentAttendanceList(
          institutionId!,
          selectedSectionId,
          resolvedAY.id,
          resolvedAY.resolvedYear,
          currentMonth
        );
        if (activeCheck && !activeCheck.active) return;
        setStudentSummary(summary);
        setStudentList(list);
      } else {
        const resolvedAY = await resolveStaffAcademicYear(
          institutionId!,
          currentMonth,
          currentYear
        );

        if (!resolvedAY) {
          if (activeCheck && !activeCheck.active) return;
          setError("Academic year details not found.");
          setIsLoading(false);
          return;
        }

        const summary = await getStaffAttendanceSummary(
          institutionId!,
          resolvedAY.id,
          resolvedAY.resolvedYear,
          currentMonth,
          selectedDept
        );
        const list = await getStaffAttendanceList(
          institutionId!,
          resolvedAY.id,
          resolvedAY.resolvedYear,
          currentMonth,
          selectedDept
        );
        if (activeCheck && !activeCheck.active) return;
        setStaffSummary(summary);
        setStaffList(list);
      }
    } catch (err: any) {
      console.error("Failed to load attendance data:", err);
      if (activeCheck && !activeCheck.active) return;
      setError(err?.message || "Something went wrong. Please check your connection.");
    } finally {
      if (!activeCheck || activeCheck.active) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const activeCheck = { active: true };
    loadAttendanceData(activeCheck);
    return () => {
      activeCheck.active = false;
    };
  }, [activeTab, selectedSectionId, selectedDept, currentMonth, currentYear, institutionId]);

  // Handle Month Navigation
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getMonthName = (m: number) => {
    const names = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return names[m - 1];
  };

  // Initials computation
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Filtering local list data
  const filteredStudents = studentList.filter(s =>
    s.studentName.toLowerCase().includes(searchVal.toLowerCase())
  );

  const filteredStaff = staffList.filter(t =>
    t.teacherName.toLowerCase().includes(searchVal.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchVal.toLowerCase())
  );

  // Render Calendar Grid Component
  const renderCalendar = (calendarData: CalendarDay[], resolvedYear: number) => {
    if (!calendarData || calendarData.length === 0) return null;

    // Find spacers (which weekday does 1st of month fall on)
    // getDay returns 0: Sunday, 1: Monday, ..., 6: Saturday
    // We want 0: Monday, ..., 6: Sunday
    const dayOfWeek = new Date(resolvedYear, currentMonth - 1, 1).getDay();
    const firstDayIndex = (dayOfWeek + 6) % 7;
    const spacers = Array(firstDayIndex).fill(null);
    const allCells = [...spacers, ...calendarData];

    return (
      <View style={[styles.cardShadow, { borderRadius: 24 }]}>
        <View style={{ backgroundColor: "white", borderRadius: 24, marginTop: 16 }}>
          <View className="bg-white rounded-3xl p-5 border border-gray-100">
            {/* Month Heading */}
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={prevMonth} className="p-1">
                <Ionicons name="chevron-back" size={20} color="#0D1B2A" />
              </TouchableOpacity>
              <Text className="font-poppins-bold text-base text-[#0D1B2A]">
                {getMonthName(currentMonth)} {resolvedYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} className="p-1">
                <Ionicons name="chevron-forward" size={20} color="#0D1B2A" />
              </TouchableOpacity>
            </View>

            {/* Legend */}
            <View className="flex-row justify-end items-center space-x-4 mb-4">
              <View className="flex-row items-center space-x-1">
                <View className="w-2.5 h-2.5 rounded-full bg-[#C9A84C]" />
                <Text className="text-[10px] font-inter text-[#75777D]">Holiday</Text>
              </View>
              <View className="flex-row items-center space-x-1">
                <View className="w-2.5 h-2.5 rounded-full bg-[#0D1B2A]" />
                <Text className="text-[10px] font-inter text-[#75777D]">School Day</Text>
              </View>
              <View className="flex-row items-center space-x-1">
                <View className="w-2.5 h-2.5 rounded-full bg-[#F5F0E8] border border-gray-300" />
                <Text className="text-[10px] font-inter text-[#75777D]">Weekend/Future</Text>
              </View>
            </View>

            {/* Weekday Labels */}
            <View className="flex-row justify-between mb-2">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((label) => (
                <View key={label} className="w-[12%] items-center">
                  <Text className="font-poppins-bold text-[9px] text-[#75777D] tracking-wider">{label}</Text>
                </View>
              ))}
            </View>

            {/* Grid Cells */}
            <View className="flex-row flex-wrap justify-start">
              {allCells.map((cell, idx) => {
                if (cell === null) {
                  return <View key={`spacer-${idx}`} className="w-[14.28%] aspect-square justify-center items-center" />;
                }

                const dateObj = new Date(cell.date);
                const dayNum = dateObj.getDate();
                const isToday = cell.date === "2026-05-25";

                let cellClass = "w-[14.28%] aspect-square justify-center items-center mb-1 relative";
                let textClass = "font-inter text-xs text-[#0D1B2A]";
                let bgCircle = null;

                if (cell.type === "weekend") {
                  textClass = "font-inter text-xs text-[#BCBEC4]";
                } else if (cell.type === "holiday") {
                  textClass = "font-poppins-bold text-xs text-white";
                  bgCircle = <View className="absolute inset-1 rounded-full bg-[#C9A84C] justify-center items-center z-[-1]" />;
                } else if (cell.type === "present") {
                  textClass = "font-poppins-bold text-xs text-white";
                  bgCircle = <View className="absolute inset-1 rounded-full bg-[#0D1B2A] justify-center items-center z-[-1]" />;
                } else if (cell.type === "absent") {
                  // Low class average day highlight (red outline/circle)
                  textClass = "font-poppins-bold text-xs text-red-600";
                  bgCircle = <View className="absolute inset-1 rounded-full border-2 border-red-500 bg-red-50 justify-center items-center z-[-1]" />;
                }

                if (isToday) {
                  // Highlight today with gold outline
                  bgCircle = <View className="absolute inset-1 rounded-full border-[2.5px] border-[#C9A84C] justify-center items-center z-[-1]" />;
                  textClass = "font-poppins-bold text-xs text-[#0D1B2A]";
                }

                return (
                  <View key={cell.date} className={cellClass}>
                    {bgCircle}
                    <Text className={textClass}>{dayNum}</Text>
                  </View>
                );
              })}
            </View>

            {/* Date Muted Text */}
            <View className="mt-3 items-center">
              <Text className="text-[10px] font-inter text-[#75777D] italic">
                Today is Monday, May 25, 2026
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Skeleton Loader Component
  const renderSkeletons = () => {
    return (
      <View className="space-y-4">
        {/* Calendar skeleton */}
        <View className="bg-white rounded-3xl p-5 border border-gray-100 h-64 justify-center items-center animate-pulse">
          <ActivityIndicator size="small" color="#C9A84C" />
        </View>

        {/* Stats Row skeleton */}
        <View className="flex-row space-x-3">
          <View className="flex-1 bg-white h-24 rounded-2xl animate-pulse" />
          <View className="flex-1 bg-white h-24 rounded-2xl animate-pulse" />
        </View>

        {/* List skeleton */}
        <View className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <View 
              key={idx} 
              className="bg-white p-4 h-16 rounded-2xl border border-gray-100 flex-row items-center justify-between"
              style={{ opacity: 0.6 }}
            >
              <View className="w-10 h-10 rounded-full bg-gray-200" />
              <View className="flex-1 ml-4 space-y-2">
                <View className="h-3 bg-gray-200 w-1/3 rounded" />
                <View className="h-2.5 bg-gray-200 w-1/2 rounded" />
              </View>
              <View className="w-16 h-6 bg-gray-200 rounded-full" />
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F0E8]">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 flex-row justify-between items-center py-4">
        <TouchableOpacity
          onPress={() => router.replace("/institution" as any)}
          className="p-2 rounded-full bg-gray-50 border border-gray-200"
        >
          <Ionicons name="arrow-back" size={18} color="#0D1B2A" />
        </TouchableOpacity>
        
        <Text className="font-poppins-bold text-base text-black">Student Attendance</Text>
        
        <TouchableOpacity
          onPress={() => router.push("/institution/utilities" as any)}
          className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center border border-gray-200 overflow-hidden"
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-[#0D1B2A]">
              <Text className="font-poppins-bold text-xs text-white">
                {fullName ? getInitials(fullName) : "T"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Selector Pill Toggle */}
      <View 
        className="bg-[#EBE5D9] p-1.5 rounded-full mx-5 my-4 flex-row border"
        style={{ borderColor: "rgba(229, 231, 235, 0.5)" }}
      >
        <TouchableOpacity
          onPress={() => {
            setActiveTab("staff");
            setSearchVal("");
          }}
          className={`flex-1 py-3 rounded-full items-center ${activeTab === "staff" ? "bg-[#0D1B2A]" : "bg-transparent"}`}
        >
          <Text className={`font-poppins-bold text-[10px] uppercase tracking-widest ${activeTab === "staff" ? "text-white" : "text-[#75777D]"}`}>
            Staff
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("student");
            setSearchVal("");
          }}
          className={`flex-1 py-3 rounded-full items-center ${activeTab === "student" ? "bg-[#0D1B2A]" : "bg-transparent"}`}
        >
          <Text className={`font-poppins-bold text-[10px] uppercase tracking-widest ${activeTab === "student" ? "text-white" : "text-[#75777D]"}`}>
            Student
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("daily");
            setSearchVal("");
          }}
          className={`flex-1 py-3 rounded-full items-center ${activeTab === "daily" ? "bg-[#0D1B2A]" : "bg-transparent"}`}
        >
          <Text className={`font-poppins-bold text-[10px] uppercase tracking-widest ${activeTab === "daily" ? "text-white" : "text-[#75777D]"}`}>
            Daily
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* STUDENT TAB CONTENT */}
        {activeTab === "student" && (
          <View>
            {/* Class Selector Label */}
            <Text className="font-poppins-bold text-xs text-[#0D1B2A] mb-2 uppercase tracking-widest">
              Select Class & Section
            </Text>
            
            {/* Horizontal Scrollable Class Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mb-4"
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {sections.map((sec) => {
                const isSelected = selectedSectionId === sec.id;
                return (
                  <TouchableOpacity
                    key={sec.id}
                    onPress={() => setSelectedSectionId(sec.id)}
                    className={`px-4 py-2.5 rounded-xl mr-2.5 border ${
                      isSelected
                        ? "bg-[#0D1B2A] border-[#0D1B2A]"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text className={`font-poppins-semibold text-xs ${isSelected ? "text-white" : "text-[#0D1B2A]"}`}>
                      {sec.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search Bar */}
            <View style={{ backgroundColor: "white", borderRadius: 9999, marginBottom: 8 }}>
              <View style={styles.searchBarShadow} className="relative bg-white border border-gray-300 rounded-full flex-row items-center px-4 py-2.5">
                <Ionicons name="search-outline" size={16} color="#75777D" className="mr-2" />
                <TextInput
                  className="flex-grow font-inter text-xs text-[#0D1B2A] py-0 outline-none"
                  placeholder="Search students..."
                  placeholderTextColor="#75777D"
                  value={searchVal}
                  onChangeText={setSearchVal}
                />
                {searchVal.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchVal("")}>
                    <Ionicons name="close-circle" size={16} color="#75777D" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isLoading ? (
              renderSkeletons()
            ) : error ? (
              <View style={[styles.cardShadow, { backgroundColor: "white", borderRadius: 24, marginTop: 16 }]}>
                <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
                  <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                  <Text className="font-poppins-semibold text-sm text-[#0D1B2A] mt-2 text-center">{error}</Text>
                  <TouchableOpacity onPress={() => loadAttendanceData()} className="mt-4 px-6 py-2 bg-[#0D1B2A] rounded-xl">
                    <Text className="text-white font-poppins-semibold text-xs">Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                {/* Calendar Grid */}
                {studentSummary && renderCalendar(studentSummary.calendarData, studentSummary.resolvedYear)}

                {/* Stats Row */}
                {studentSummary && (
                  <View className="flex-row space-x-3 mt-4">
                    {/* Left Card: Monthly Average */}
                    <View style={[styles.cardShadow, { flex: 1, backgroundColor: "#0D1B2A", borderRadius: 24 }]}>
                      <View className="bg-[#0D1B2A] p-4 rounded-3xl border border-slate-800 flex-1">
                        <Text
                          className="font-poppins-bold text-[9px] uppercase tracking-widest"
                          style={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          Monthly Avg
                        </Text>
                        <Text className="font-poppins-bold text-2xl text-[#C9A84C] mt-2">
                          {studentSummary.monthlyAvg}%
                        </Text>
                        <View className="flex-row items-center space-x-1 mt-1">
                          <Ionicons name="trending-up" size={12} color="#4CAF50" />
                          <Text className="font-inter-semibold text-[9px] text-[#4CAF50] font-bold">
                            +1.2% vs average
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right Card: Critical Days */}
                    <View style={[styles.cardShadow, { flex: 1, backgroundColor: "white", borderRadius: 24 }]}>
                      <View className="bg-white p-4 rounded-3xl border border-gray-100 flex-1">
                        <Text className="font-poppins-bold text-[9px] text-[#75777D] uppercase tracking-widest">
                          Critical Days
                        </Text>
                        <Text className="font-poppins-bold text-2xl text-[#EF4444] mt-2">
                          {String(studentSummary.criticalDays).padStart(2, "0")}
                        </Text>
                        <Text className="font-inter text-[9px] text-[#75777D] mt-1">
                          Below 85% target
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Student List Section */}
                <View className="mt-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="font-poppins-bold text-sm text-[#0D1B2A]">
                      Student List
                    </Text>
                    <TouchableOpacity onPress={() => console.log("Navigating to view all students")}>
                      <Text className="font-poppins-bold text-xs text-[#C9A84C]">
                        View All
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Student Cards */}
                  {filteredStudents.length === 0 ? (
                    <Text className="text-center py-6 text-xs text-[#75777D] font-inter italic">
                      No matching students found.
                    </Text>
                  ) : (
                    filteredStudents.map((item, index) => {
                      const percent = item.attendancePercent;
                      let badgeStyle = {};
                      let badgeTextClass = "";

                      if (item.status === "excellent") {
                        badgeStyle = { borderColor: "#a7f3d0", backgroundColor: "rgba(209, 250, 229, 0.5)" };
                        badgeTextClass = "text-[#4CAF50]";
                      } else if (item.status === "leadership") {
                        badgeStyle = { borderColor: "#bfdbfe", backgroundColor: "rgba(219, 234, 254, 0.5)" };
                        badgeTextClass = "text-[#2196F3]";
                      } else if (item.status === "warning") {
                        badgeStyle = { borderColor: "rgba(201, 168, 76, 0.3)", backgroundColor: "rgba(201, 168, 76, 0.05)" };
                        badgeTextClass = "text-[#C9A84C]";
                      } else if (item.status === "critical") {
                        badgeStyle = { borderColor: "#fecaca", backgroundColor: "rgba(254, 226, 226, 0.5)" };
                        badgeTextClass = "text-red-500";
                      }

                      return (
                        <View key={item.studentId ?? index} style={{ backgroundColor: "white", borderRadius: 24, marginBottom: 12, ...styles.cardShadow }} className="bg-white p-4 rounded-3xl border border-gray-100">
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center space-x-3 flex-1">
                                {/* Grey Initials Avatar */}
                                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
                                  <Text className="font-poppins-bold text-xs text-[#75777D]">
                                    {item.initials}
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text className="font-poppins-bold text-xs text-[#0D1B2A] leading-tight">
                                    {item.studentName}
                                  </Text>
                                  <Text className="text-[10px] font-inter text-[#75777D] mt-0.5">
                                    Present {item.presentDays}/{item.totalDays} days
                                  </Text>
                                </View>
                              </View>

                              {/* Badge */}
                              <View
                                className="px-2.5 py-1 rounded-lg border"
                                style={badgeStyle}
                              >
                                <Text className={`font-poppins-bold text-[8.5px] uppercase tracking-wider ${badgeTextClass}`}>
                                  {item.status}
                                </Text>
                              </View>
                            </View>

                            {/* Gold Progress Bar */}
                            <View className="flex-row items-center space-x-2 mt-3">
                              <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${percent}%` }} />
                              </View>
                              <Text className="font-poppins-bold text-[10px] text-[#0D1B2A]">
                                {percent}%
                              </Text>
                            </View>
                          </View>
                        
                      );
                    })
                  )}
                </View>

                {/* Insight Card */}
                {studentSummary && (
                  <View style={[styles.insightShadow, { backgroundColor: "#FAF2DF", borderRadius: 24, marginTop: 20 }]}>
                    <View className="bg-[#FAF2DF] p-5 rounded-3xl border border-[#C9A84C]/20 flex-row space-x-3 items-start">
                      <View className="bg-[#C9A84C] p-2 rounded-xl">
                        <Ionicons name="bulb" size={16} color="white" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-poppins-bold text-xs text-[#735c00]">
                          Attendance Insight
                        </Text>
                        <Text className="font-inter text-xs text-slate-700 leading-relaxed mt-1">
                          {studentSummary.insight}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* STAFF TAB CONTENT */}
        {activeTab === "staff" && (
          <View>
            {/* Department Selector Label */}
            <Text className="font-poppins-bold text-xs text-[#0D1B2A] mb-2 uppercase tracking-widest">
              Select Department
            </Text>
            
            {/* Horizontal Scrollable Department Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mb-4"
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedDept("All")}
                className={`px-4 py-2.5 rounded-xl mr-2.5 border ${
                  selectedDept === "All"
                    ? "bg-[#0D1B2A] border-[#0D1B2A]"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text className={`font-poppins-semibold text-xs ${selectedDept === "All" ? "text-white" : "text-[#0D1B2A]"}`}>
                  All
                </Text>
              </TouchableOpacity>
              {departments.map((dept) => {
                const isSelected = selectedDept === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    onPress={() => setSelectedDept(dept)}
                    className={`px-4 py-2.5 rounded-xl mr-2.5 border ${
                      isSelected
                        ? "bg-[#0D1B2A] border-[#0D1B2A]"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text className={`font-poppins-semibold text-xs ${isSelected ? "text-white" : "text-[#0D1B2A]"}`}>
                      {dept}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search Bar */}
            <View style={[styles.searchBarShadow, { backgroundColor: "white", borderRadius: 9999, marginBottom: 8 }]}>
              <View className="relative bg-white border border-gray-300 rounded-full flex-row items-center px-4 py-2.5">
                <Ionicons name="search-outline" size={16} color="#75777D" className="mr-2" />
                <TextInput
                  className="flex-grow font-inter text-xs text-[#0D1B2A] py-0 outline-none"
                  placeholder="Search staff..."
                  placeholderTextColor="#75777D"
                  value={searchVal}
                  onChangeText={setSearchVal}
                />
                {searchVal.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchVal("")}>
                    <Ionicons name="close-circle" size={16} color="#75777D" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isLoading ? (
              renderSkeletons()
            ) : error ? (
              <View style={[styles.cardShadow, { backgroundColor: "white", borderRadius: 24, marginTop: 16 }]}>
                <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
                  <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                  <Text className="font-poppins-semibold text-sm text-[#0D1B2A] mt-2 text-center">{error}</Text>
                  <TouchableOpacity onPress={() => loadAttendanceData()} className="mt-4 px-6 py-2 bg-[#0D1B2A] rounded-xl">
                    <Text className="text-white font-poppins-semibold text-xs">Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                {/* Calendar Grid */}
                {staffSummary && renderCalendar(staffSummary.calendarData, staffSummary.resolvedYear)}

                {/* Stats Row */}
                {staffSummary && (
                  <View className="flex-row space-x-3 mt-4">
                    {/* Left Card: Department Average */}
                    <View style={[styles.cardShadow, { flex: 1, backgroundColor: "#0D1B2A", borderRadius: 24 }]}>
                      <View className="bg-[#0D1B2A] p-4 rounded-3xl border border-slate-800 flex-1">
                        <Text 
                          className="font-poppins-bold text-[9px] uppercase tracking-widest"
                          style={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          Dept Average
                        </Text>
                        <Text className="font-poppins-bold text-2xl text-[#C9A84C] mt-2">
                          {staffSummary.monthlyAvg}%
                        </Text>
                        <View className="flex-row items-center space-x-1 mt-1">
                          <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                          <Text className="font-inter-semibold text-[9px] text-[#4CAF50] font-bold">
                            Attendance is stable
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right Card: Staff On Leave Today */}
                    <View style={[styles.cardShadow, { flex: 1, backgroundColor: "white", borderRadius: 24 }]}>
                      <View className="bg-white p-4 rounded-3xl border border-gray-100 flex-1">
                        <Text className="font-poppins-bold text-[9px] text-[#75777D] uppercase tracking-widest">
                          On Leave Today
                        </Text>
                        <Text className="font-poppins-bold text-2xl text-[#0D1B2A] mt-2">
                          {String(staffSummary.staffOnLeaveToday).padStart(2, "0")}
                        </Text>
                        <Text className="font-inter text-[9px] text-[#75777D] mt-1">
                          Active planned leaves
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Staff List Section */}
                <View className="mt-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="font-poppins-bold text-sm text-[#0D1B2A]">
                      Staff List
                    </Text>
                    <TouchableOpacity onPress={() => console.log("Navigating to view all teachers")}>
                      <Text className="font-poppins-bold text-xs text-[#C9A84C]">
                        View All
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Staff Cards */}
                  {filteredStaff.length === 0 ? (
                    <Text className="text-center py-6 text-xs text-[#75777D] font-inter italic">
                      No matching staff found.
                    </Text>
                  ) : (
                    filteredStaff.map((item, index) => {
                      const percent = item.attendancePercent;
                      let badgeStyle = {};
                      let badgeTextClass = "";

                      if (item.status === "excellent") {
                        badgeStyle = { borderColor: "#a7f3d0", backgroundColor: "rgba(209, 250, 229, 0.5)" };
                        badgeTextClass = "text-[#4CAF50]";
                      } else if (item.status === "leadership") {
                        badgeStyle = { borderColor: "#bfdbfe", backgroundColor: "rgba(219, 234, 254, 0.5)" };
                        badgeTextClass = "text-[#2196F3]";
                      } else if (item.status === "warning") {
                        badgeStyle = { borderColor: "rgba(201, 168, 76, 0.3)", backgroundColor: "rgba(201, 168, 76, 0.05)" };
                        badgeTextClass = "text-[#C9A84C]";
                      } else if (item.status === "critical") {
                        badgeStyle = { borderColor: "#fecaca", backgroundColor: "rgba(254, 226, 226, 0.5)" };
                        badgeTextClass = "text-red-500";
                      }

                      return (
                        <View key={item.teacherId ?? index} style={{ backgroundColor: "white", borderRadius: 24, marginBottom: 12, ...styles.cardShadow }} className="bg-white p-4 rounded-3xl border border-gray-100">
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center space-x-3 flex-1">
                                {/* Gold Initials Avatar */}
                                <View className="w-10 h-10 rounded-full bg-[#FAF2DF] items-center justify-center border border-[#C9A84C]/45">
                                  <Text className="font-poppins-bold text-xs text-[#C9A84C]">
                                    {item.initials}
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text className="font-poppins-bold text-xs text-[#0D1B2A] leading-tight">
                                    {item.teacherName}
                                  </Text>
                                  <Text className="text-[10px] font-inter text-[#75777D] mt-0.5 font-semibold">
                                    {item.subject}
                                  </Text>
                                  <Text className="text-[9px] font-inter text-[#BCBEC4] mt-0.5">
                                    Attended {item.presentDays}/{item.totalDays} days
                                  </Text>
                                </View>
                              </View>

                              {/* Badge */}
                              <View
                                className="px-2.5 py-1 rounded-lg border"
                                style={badgeStyle}
                              >
                                <Text className={`font-poppins-bold text-[8.5px] uppercase tracking-wider ${badgeTextClass}`}>
                                  {item.status}
                                </Text>
                              </View>
                            </View>

                            {/* Gold Progress Bar */}
                            <View className="flex-row items-center space-x-2 mt-3">
                              <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${percent}%` }} />
                              </View>
                              <Text className="font-poppins-bold text-[10px] text-[#0D1B2A]">
                                {percent}%
                              </Text>
                            </View>
                          </View>
                      );
                    })
                  )}
                </View>

                {/* Insight Card */}
                {staffSummary && (
                  <View style={[styles.insightShadow, { backgroundColor: "#FAF2DF", borderRadius: 24, marginTop: 20 }]}>
                    <View className="bg-[#FAF2DF] p-5 rounded-3xl border border-[#C9A84C]/20 flex-row space-x-3 items-start">
                      <View className="bg-[#C9A84C] p-2 rounded-xl">
                        <Ionicons name="bulb" size={16} color="white" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-poppins-bold text-xs text-[#735c00]">
                          Attendance Insight
                        </Text>
                        <Text className="font-inter text-xs text-slate-700 leading-relaxed mt-1">
                          {staffSummary.insight}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* DAILY TAB CONTENT */}
        {activeTab === "daily" && (
          <View>
            {/* Date Navigation Header */}
            <View style={[styles.cardShadow, { borderRadius: 24, marginBottom: 16 }]}>
              <View className="bg-white rounded-3xl p-5 border border-gray-100 flex-row justify-between items-center">
                <TouchableOpacity onPress={() => adjustDailyDate(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded-full">
                  <Ionicons name="chevron-back" size={18} color="#0D1B2A" />
                </TouchableOpacity>
                
                <View className="items-center flex-1">
                  <Text className="font-poppins-bold text-xs text-[#75777D] uppercase tracking-widest">
                    Selected Date
                  </Text>
                  <Text className="font-poppins-bold text-sm text-[#0D1B2A] mt-1 text-center">
                    {formatDailyDate(dailySelectedDate)}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => adjustDailyDate(1)} className="p-2 bg-slate-50 border border-slate-200 rounded-full">
                  <Ionicons name="chevron-forward" size={18} color="#0D1B2A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={{ backgroundColor: "white", borderRadius: 9999, marginBottom: 16 }}>
              <View style={styles.searchBarShadow} className="relative bg-white border border-gray-300 rounded-full flex-row items-center px-4 py-2.5">
                <Ionicons name="search-outline" size={16} color="#75777D" className="mr-2" />
                <TextInput
                  className="flex-grow font-inter text-xs text-[#0D1B2A] py-0 outline-none"
                  placeholder="Search classes or sections..."
                  placeholderTextColor="#75777D"
                  value={searchVal}
                  onChangeText={setSearchVal}
                />
                {searchVal.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchVal("")}>
                    <Ionicons name="close-circle" size={16} color="#75777D" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isDailyLoading ? (
              renderSkeletons()
            ) : dailyError ? (
              <View style={[styles.cardShadow, { backgroundColor: "white", borderRadius: 24, marginTop: 16 }]}>
                <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
                  <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                  <Text className="font-poppins-semibold text-sm text-[#0D1B2A] mt-2 text-center">{dailyError}</Text>
                  <TouchableOpacity onPress={() => refetchDaily()} className="mt-4 px-6 py-2 bg-[#0D1B2A] rounded-xl">
                    <Text className="text-white font-poppins-semibold text-xs">Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                {/* Stats Row */}
                {(() => {
                  const totalPresent = dailyBreakdown.reduce((sum, item) => sum + item.presentCount, 0);
                  const totalStudents = dailyBreakdown.reduce((sum, item) => sum + item.totalCount, 0);
                  const totalAbsent = dailyBreakdown.reduce((sum, item) => sum + item.absentCount, 0);
                  const overallPercent = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
                  
                  return (
                    <View className="flex-row space-x-3 mb-4">
                      {/* Card 1: Attendance Rate */}
                      <View style={[styles.cardShadow, { flex: 1, backgroundColor: "#0D1B2A", borderRadius: 24 }]}>
                        <View className="bg-[#0D1B2A] p-4 rounded-3xl border border-slate-800 flex-1">
                          <Text
                            className="font-poppins-bold text-[9px] uppercase tracking-widest"
                            style={{ color: "rgba(255, 255, 255, 0.7)" }}
                          >
                            Institution Rate
                          </Text>
                          <Text className="font-poppins-bold text-2xl text-[#C9A84C] mt-2">
                            {overallPercent}%
                          </Text>
                          <Text className="font-inter text-[9px] text-[#4CAF50] mt-1 font-semibold">
                            Active Students
                          </Text>
                        </View>
                      </View>

                      {/* Card 2: Student Counts */}
                      <View style={[styles.cardShadow, { flex: 1, backgroundColor: "white", borderRadius: 24 }]}>
                        <View className="bg-white p-4 rounded-3xl border border-gray-100 flex-1">
                          <Text className="font-poppins-bold text-[9px] text-[#75777D] uppercase tracking-widest">
                            Present / Absent
                          </Text>
                          <Text className="font-poppins-bold text-lg text-[#0D1B2A] mt-2">
                            {totalPresent} / {totalStudents}
                          </Text>
                          <Text className="font-inter text-[9px] text-red-500 mt-1 font-semibold">
                            {totalAbsent} Absent Today
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Class Breakdown List */}
                <View className="mt-4">
                  <Text className="font-poppins-bold text-sm text-[#0D1B2A] mb-3">
                    Class Breakdown
                  </Text>

                  {filteredDailyBreakdown.length === 0 ? (
                    <Text className="text-center py-6 text-xs text-[#75777D] font-inter italic">
                      No matching classes found.
                    </Text>
                  ) : (
                    filteredDailyBreakdown.map((item) => {
                      const percent = item.totalCount > 0 ? Math.round((item.presentCount / item.totalCount) * 100) : 0;
                      
                      // Status check based on attendance percent
                      let status = "critical";
                      let badgeStyle = { borderColor: "#fecaca", backgroundColor: "rgba(254, 226, 226, 0.5)" };
                      let badgeTextClass = "text-red-500";
                      
                      if (percent >= 90) {
                        status = "excellent";
                        badgeStyle = { borderColor: "#a7f3d0", backgroundColor: "rgba(209, 250, 229, 0.5)" };
                        badgeTextClass = "text-[#4CAF50]";
                      } else if (percent >= 80) {
                        status = "warning";
                        badgeStyle = { borderColor: "rgba(201, 168, 76, 0.3)", backgroundColor: "rgba(201, 168, 76, 0.05)" };
                        badgeTextClass = "text-[#C9A84C]";
                      }
                      
                      return (
                        <View 
                          key={`${item.classId}-${item.sectionId}`} 
                          style={{ backgroundColor: "white", borderRadius: 24, marginBottom: 12, ...styles.cardShadow }} 
                          className="bg-white p-4 rounded-3xl border border-gray-100"
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center space-x-3 flex-1">
                              <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
                                <Ionicons name="school-outline" size={18} color="#75777D" />
                              </View>
                              <View className="flex-1">
                                <Text className="font-poppins-bold text-xs text-[#0D1B2A] leading-tight">
                                  {item.className} - {item.sectionName}
                                </Text>
                                <Text className="text-[10px] font-inter text-[#75777D] mt-0.5">
                                  Present: {item.presentCount}/{item.totalCount} | Absent: {item.absentCount}
                                </Text>
                              </View>
                            </View>

                            <View className="px-2.5 py-1 rounded-lg border" style={badgeStyle}>
                              <Text className={`font-poppins-bold text-[8.5px] uppercase tracking-wider ${badgeTextClass}`}>
                                {status}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center space-x-2 mt-3">
                            <View className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <View className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${percent}%` }} />
                            </View>
                            <Text className="font-poppins-bold text-[10px] text-[#0D1B2A]">
                              {percent}%
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchBarShadow: {
    borderColor: "rgba(209, 213, 219, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightShadow: {
    borderColor: "rgba(201, 168, 76, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
