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
  const { isLoaded, isSignedIn, role, userId, institutionId, fullName, theme } = useAuth();
  
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const primaryAltColor = theme?.colors?.primaryAlt ?? "#162A56";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#F2C14E";
  const creamColor = theme?.colors?.cream ?? "#F5F0E8";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";
  const steelGrayColor = theme?.colors?.steelGray ?? "#6B7280";
  const warningColor = theme?.colors?.warning ?? "#EAB308";
  const lightGrayColor = theme?.colors?.lightGray ?? "#E5E7EB";
  const successColor = theme?.colors?.success ?? "#22C55E";
  const whiteColor = theme?.colors?.white ?? "#FFFFFF";
  const charcoalColor = theme?.colors?.charcoal ?? "#333333";
  
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
    if (!item) return false;
    const searchLower = (searchVal || "").trim().toLowerCase();
    if (!searchLower) return true;
    return (
      (item.className || "").toLowerCase().includes(searchLower) ||
      (item.sectionName || "").toLowerCase().includes(searchLower)
    );
  });

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
    let isActive = true;
    if (userId) {
      supabase
        .from("users")
        .select("profile_photo_url")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (isActive && data?.profile_photo_url) {
            setProfilePhoto(data.profile_photo_url);
          }
        });
    }
    return () => { isActive = false; };
  }, [userId]);

  // 3. Fetch initial filter options (Sections for student, Departments for staff)
  useEffect(() => {
    let isActive = true;
    if (!institutionId) return;

    async function loadFilterOptions() {
      try {
        const sectionsData = await getInstitutionSections(institutionId!);
        if (!isActive) return;
        setSections(sectionsData);
        if (sectionsData.length > 0) {
          setSelectedSectionId(sectionsData[0].id);
        }

        const deptData = await getDepartments(institutionId!);
        if (!isActive) return;
        setDepartments(deptData);
      } catch (err) {
        console.error("Failed to load initial chip selectors:", err);
      }
    }

    loadFilterOptions();
    return () => { isActive = false; };
  }, [institutionId]);

  // 4. Fetch Attendance Data based on active state (Tab, Month, Selection)
  const loadAttendanceData = async (activeCheck?: { active: boolean }) => {
    if (!institutionId) return;
    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === "student") {
        if (!selectedSectionId) {
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

        const [summary, list] = await Promise.all([
          getStudentAttendanceSummary(
            institutionId!,
            selectedSectionId,
            resolvedAY.id,
            resolvedAY.resolvedYear,
            currentMonth
          ),
          getStudentAttendanceList(
            institutionId!,
            selectedSectionId,
            resolvedAY.id,
            resolvedAY.resolvedYear,
            currentMonth
          ),
        ]);
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

        const [summary, list] = await Promise.all([
          getStaffAttendanceSummary(
            institutionId!,
            resolvedAY.id,
            resolvedAY.resolvedYear,
            currentMonth,
            selectedDept
          ),
          getStaffAttendanceList(
            institutionId!,
            resolvedAY.id,
            resolvedAY.resolvedYear,
            currentMonth,
            selectedDept
          ),
        ]);
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
  const getInitials = (name: string | null | undefined) => {
    if (!name || typeof name !== "string") return "??";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase() || "??";
  };

  // Filtering local list data
  const filteredStudents = studentList.filter(s => {
    if (!s) return false;
    const name = s.studentName || "";
    const term = searchVal || "";
    return name.toLowerCase().includes(term.toLowerCase());
  });

  const filteredStaff = staffList.filter(t => {
    if (!t) return false;
    const name = t.teacherName || "";
    const subj = t.subject || "";
    const term = searchVal || "";
    return (
      name.toLowerCase().includes(term.toLowerCase()) ||
      subj.toLowerCase().includes(term.toLowerCase())
    );
  });

  // Render Calendar Grid Component
  const renderCalendar = (calendarData: CalendarDay[], resolvedYear: number) => {
    if (!calendarData || calendarData.length === 0) return null;

    const todayLabel = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });

    // Find spacers (which weekday does 1st of month fall on)
    // getDay returns 0: Sunday, 1: Monday, ..., 6: Saturday
    // We want 0: Monday, ..., 6: Sunday
    const dayOfWeek = new Date(resolvedYear, currentMonth - 1, 1).getDay();
    const firstDayIndex = (dayOfWeek + 6) % 7;
    const spacers = Array(firstDayIndex).fill(null);
    const allCells = [...spacers, ...calendarData];

    // Pad allCells to always be a multiple of 7
    const paddedCells = [...allCells];
    while (paddedCells.length % 7 !== 0) {
      paddedCells.push(null);
    }

    // Chunk paddedCells into rows of 7
    const rows = [];
    for (let i = 0; i < paddedCells.length; i += 7) {
      rows.push(paddedCells.slice(i, i + 7));
    }

    return (
      <View style={{ backgroundColor: whiteColor, borderRadius: 24, marginTop: 16, padding: 20, borderWidth: 1, borderColor: lightGrayColor }}>
        {/* Month Heading */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={20} color={primaryColor} />
          </TouchableOpacity>
          <Text style={{ fontFamily: "Poppins-Bold", fontSize: 16, color: primaryColor }}>
            {getMonthName(currentMonth)} {resolvedYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
            <Ionicons name="chevron-forward" size={20} color={primaryColor} />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: warningColor }} />
            <Text style={{ fontSize: 10, fontFamily: "Inter-Regular", color: steelGrayColor }}>Holiday</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: primaryColor }} />
            <Text style={{ fontSize: 10, fontFamily: "Inter-Regular", color: steelGrayColor }}>School Day</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: creamColor, borderWidth: 1, borderColor: lightGrayColor }} />
            <Text style={{ fontSize: 10, fontFamily: "Inter-Regular", color: steelGrayColor }}>Weekend/Future</Text>
          </View>
        </View>

        {/* Weekday Labels */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((label) => (
            <View key={label} style={{ width: 42, alignItems: "center" }}>
              <Text style={{ fontFamily: "Poppins-Bold", fontSize: 9, letterSpacing: 1, color: steelGrayColor }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Grid Cells */}
        <View>
          {rows.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              {row.map((cell, idx) => {
                if (cell === null) {
                  return (
                    <View key={`spacer-${rowIdx}-${idx}`} style={{ width: 42, height: 40 }} />
                  );
                }

                const dateObj = new Date(cell.date);
                const dayNum = dateObj.getDate();
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = cell.date === todayStr;

                let textStyle: any = {
                  fontFamily: "Inter-Regular",
                  fontSize: 12,
                  color: primaryColor,
                };
                let bgStyle: any = {
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                };

                if (cell.type === "weekend") {
                  textStyle = { fontFamily: "Inter-Regular", fontSize: 12, color: steelGrayColor };
                  bgStyle = { ...bgStyle, backgroundColor: "transparent" };
                } else if (cell.type === "future" || cell.type === "no_data") {
                  textStyle = { fontFamily: "Inter-Regular", fontSize: 12, color: steelGrayColor };
                  bgStyle = { ...bgStyle, backgroundColor: "transparent" };
                } else if (cell.type === "holiday") {
                  textStyle = { fontFamily: "Poppins-Bold", fontSize: 12, color: whiteColor };
                  bgStyle = { ...bgStyle, backgroundColor: warningColor };
                } else if (cell.type === "present") {
                  textStyle = { fontFamily: "Poppins-Bold", fontSize: 12, color: whiteColor };
                  bgStyle = { ...bgStyle, backgroundColor: primaryColor };
                } else if (cell.type === "absent") {
                  textStyle = { fontFamily: "Poppins-Bold", fontSize: 12, color: dangerColor };
                  bgStyle = {
                    ...bgStyle,
                    borderColor: dangerColor,
                    borderWidth: 2,
                    backgroundColor: `${dangerColor}1A`,
                  };
                }

                if (isToday) {
                  bgStyle = {
                    ...bgStyle,
                    borderColor: secondaryColor,
                    borderWidth: 2.5,
                  };
                  if (cell.type !== "weekend" && cell.type !== "absent" && cell.type !== "future" && cell.type !== "no_data") {
                    bgStyle.backgroundColor = primaryColor;
                    textStyle = { fontFamily: "Poppins-Bold", fontSize: 12, color: whiteColor };
                  } else if (cell.type === "absent") {
                    bgStyle.backgroundColor = `${dangerColor}1A`;
                    textStyle = { fontFamily: "Poppins-Bold", fontSize: 12, color: dangerColor };
                  } else {
                    bgStyle.backgroundColor = "transparent";
                    textStyle = { fontFamily: "Poppins-Bold", fontSize: 12, color: primaryColor };
                  }
                }

                return (
                  <View
                    key={cell.date}
                    style={{
                      width: 42,
                      height: 40,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View style={bgStyle}>
                      <Text style={textStyle}>{dayNum}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Date Muted Text */}
        <View style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: "Inter-Regular", fontSize: 10, fontStyle: "italic", color: steelGrayColor }}>
            Today is {todayLabel}
          </Text>
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
          <ActivityIndicator size="small" color={secondaryColor} />
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
    <SafeAreaView style={{ flex: 1, backgroundColor: creamColor }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 flex-row justify-between items-center py-4">
        <TouchableOpacity
          onPress={() => router.replace("/institution" as any)}
          className="p-2 rounded-full bg-gray-50 border border-gray-200"
        >
          <Ionicons name="arrow-back" size={18} color={primaryColor} />
        </TouchableOpacity>
        
        <Text className="font-poppins-bold text-base text-black">Student Attendance</Text>
        
        <TouchableOpacity
          onPress={() => router.push("/institution/utilities" as any)}
          className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center border border-gray-200 overflow-hidden"
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <Text className="font-poppins-bold text-xs text-white">
                {fullName ? getInitials(fullName) : "T"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Selector Pill Toggle */}
      <View 
        className="p-1.5 rounded-full mx-5 my-4 flex-row border"
        style={{ backgroundColor: creamColor, borderColor: "rgba(229, 231, 235, 0.5)" }}
      >
        <TouchableOpacity
          onPress={() => {
            setActiveTab("staff");
            setSearchVal("");
          }}
          className="flex-1 py-3 rounded-full items-center"
          style={{ backgroundColor: activeTab === "staff" ? primaryColor : "transparent" }}
        >
          <Text 
            className="font-poppins-bold text-[10px] uppercase tracking-widest"
            style={{ color: activeTab === "staff" ? "white" : steelGrayColor }}
          >
            Staff
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("student");
            setSearchVal("");
          }}
          className="flex-1 py-3 rounded-full items-center"
          style={{ backgroundColor: activeTab === "student" ? primaryColor : "transparent" }}
        >
          <Text 
            className="font-poppins-bold text-[10px] uppercase tracking-widest"
            style={{ color: activeTab === "student" ? "white" : steelGrayColor }}
          >
            Student
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("daily");
            setSearchVal("");
          }}
          className="flex-1 py-3 rounded-full items-center"
          style={{ backgroundColor: activeTab === "daily" ? primaryColor : "transparent" }}
        >
          <Text 
            className="font-poppins-bold text-[10px] uppercase tracking-widest"
            style={{ color: activeTab === "daily" ? "white" : steelGrayColor }}
          >
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
            <Text className="font-poppins-bold text-xs mb-2 uppercase tracking-widest" style={{ color: primaryColor }}>
              Select Class & Section
            </Text>
            
            {/* Horizontal Scrollable Class Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mb-4 min-h-[44px]"
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {sections.map((sec) => {
                const isSelected = selectedSectionId === sec.id;
                return (
                  <TouchableOpacity
                    key={sec.id}
                    onPress={() => setSelectedSectionId(sec.id)}
                    className="px-4 py-2.5 rounded-xl mr-2.5 border"
                    style={{
                      backgroundColor: isSelected ? primaryColor : whiteColor,
                      borderColor: isSelected ? primaryColor : lightGrayColor
                    }}
                  >
                    <Text className="font-poppins-semibold text-xs" style={{ color: isSelected ? "white" : primaryColor }}>
                      {sec.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search Bar */}
            <View style={{ backgroundColor: whiteColor, borderRadius: 9999, marginBottom: 8 }}>
              <View className="relative bg-white border rounded-full flex-row items-center px-4 py-2.5" style={{ borderColor: lightGrayColor }}>
                <Ionicons name="search-outline" size={16} color={steelGrayColor} className="mr-2" />
                <TextInput
                  className="flex-grow font-inter text-xs py-0 outline-none"
                  style={{ color: primaryColor }}
                  placeholder="Search students..."
                  placeholderTextColor={steelGrayColor}
                  value={searchVal}
                  onChangeText={setSearchVal}
                />
                {searchVal.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchVal("")}>
                    <Ionicons name="close-circle" size={16} color={steelGrayColor} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isLoading ? (
              renderSkeletons()
            ) : error ? (
              <View style={{ backgroundColor: whiteColor, borderRadius: 24, marginTop: 16 }}>
                <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
                  <Ionicons name="alert-circle-outline" size={40} color={dangerColor} />
                  <Text className="font-poppins-semibold text-sm mt-2 text-center" style={{ color: primaryColor }}>{error}</Text>
                  <TouchableOpacity onPress={() => loadAttendanceData()} className="mt-4 px-6 py-2 rounded-xl" style={{ backgroundColor: primaryColor }}>
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
                    <View style={{ flex: 1, backgroundColor: primaryColor, borderRadius: 24 }}>
                      <View className="p-4 rounded-3xl border border-slate-800 flex-1" style={{ backgroundColor: primaryColor }}>
                        <Text
                          className="font-poppins-bold text-[9px] uppercase tracking-widest"
                          style={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          Monthly Avg
                        </Text>
                        <Text className="font-poppins-bold text-2xl mt-2" style={{ color: secondaryColor }}>
                          {studentSummary.monthlyAvg}%
                        </Text>
                        <View className="flex-row items-center space-x-1 mt-1">
                           <Ionicons name="trending-up" size={12} color={successColor} />
                          <Text className="font-inter-semibold text-[9px] font-bold" style={{ color: successColor }}>
                            +1.2% vs average
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right Card: Critical Days */}
                    <View style={{ flex: 1, backgroundColor: whiteColor, borderRadius: 24 }}>
                      <View className="bg-white p-4 rounded-3xl border border-gray-100 flex-1">
                        <Text className="font-poppins-bold text-[9px] uppercase tracking-widest" style={{ color: steelGrayColor }}>
                          Critical Days
                        </Text>
                        <Text className="font-poppins-bold text-2xl mt-2" style={{ color: dangerColor }}>
                          {String(studentSummary.criticalDays).padStart(2, "0")}
                        </Text>
                        <Text className="font-inter text-[9px] mt-1" style={{ color: steelGrayColor }}>
                          Below 85% target
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Student List Section */}
                <View className="mt-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }}>
                      Student List
                    </Text>
                    <TouchableOpacity onPress={() => console.log("Navigating to view all students")}>
                      <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Student Cards */}
                  {filteredStudents.length === 0 ? (
                    <Text className="text-center py-6 text-xs font-inter italic" style={{ color: steelGrayColor }}>
                      No matching students found.
                    </Text>
                  ) : (
                    filteredStudents.map((item, index) => {
                      const percent = Number(item.attendancePercent) || 0;
                      let badgeStyle = {};
                      let badgeTextColor = steelGrayColor;

                      if (item.status === "excellent") {
                        badgeStyle = { borderColor: `${successColor}80`, backgroundColor: `${successColor}1A` };
                        badgeTextColor = successColor;
                      } else if (item.status === "leadership") {
                        badgeStyle = { borderColor: `${primaryAltColor}80`, backgroundColor: `${primaryAltColor}1A` };
                        badgeTextColor = primaryAltColor;
                      } else if (item.status === "warning") {
                        badgeStyle = { borderColor: `${secondaryColor}4D`, backgroundColor: `${secondaryColor}0D` };
                        badgeTextColor = secondaryColor;
                      } else if (item.status === "critical") {
                        badgeStyle = { borderColor: `${dangerColor}80`, backgroundColor: `${dangerColor}1A` };
                        badgeTextColor = dangerColor;
                      }

                      return (
                        <View 
                          key={item.studentId ?? index} 
                          style={{ backgroundColor: whiteColor, borderRadius: 24, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: lightGrayColor }}
                        >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center space-x-3 flex-1">
                                {/* Grey Initials Avatar */}
                                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
                                  <Text className="font-poppins-bold text-xs" style={{ color: steelGrayColor }}>
                                    {item.initials}
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text className="font-poppins-bold text-xs leading-tight" style={{ color: primaryColor }}>
                                    {item.studentName}
                                  </Text>
                                  <Text className="text-[10px] font-inter mt-0.5" style={{ color: steelGrayColor }}>
                                    Present {item.presentDays}/{item.totalDays} days
                                  </Text>
                                </View>
                              </View>

                              {/* Badge */}
                              <View
                                className="px-2.5 py-1 rounded-lg border"
                                style={badgeStyle}
                              >
                                <Text className="font-poppins-bold text-[8.5px] uppercase tracking-wider" style={{ color: badgeTextColor }}>
                                  {item.status}
                                </Text>
                              </View>
                            </View>

                            {/* Gold Progress Bar */}
                            <View className="flex-row items-center space-x-2 mt-3">
                              <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: secondaryColor }} />
                              </View>
                              <Text className="font-poppins-bold text-[10px]" style={{ color: primaryColor }}>
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

        {/* STAFF TAB CONTENT */}
        {activeTab === "staff" && (
          <View>
            {/* Department Selector Label */}
            <Text className="font-poppins-bold text-xs mb-2 uppercase tracking-widest" style={{ color: primaryColor }}>
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
                className="px-4 py-2.5 rounded-xl mr-2.5 border"
                style={{
                  backgroundColor: selectedDept === "All" ? primaryColor : whiteColor,
                  borderColor: selectedDept === "All" ? primaryColor : lightGrayColor
                }}
              >
                <Text className="font-poppins-semibold text-xs" style={{ color: selectedDept === "All" ? "white" : primaryColor }}>
                  All
                </Text>
              </TouchableOpacity>
              {departments.map((dept) => {
                const isSelected = selectedDept === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    onPress={() => setSelectedDept(dept)}
                    className="px-4 py-2.5 rounded-xl mr-2.5 border"
                    style={{
                      backgroundColor: isSelected ? primaryColor : whiteColor,
                      borderColor: isSelected ? primaryColor : lightGrayColor
                    }}
                  >
                    <Text className="font-poppins-semibold text-xs" style={{ color: isSelected ? "white" : primaryColor }}>
                      {dept}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search Bar */}
            <View style={{ backgroundColor: whiteColor, borderRadius: 9999, marginBottom: 8 }}>
              <View className="relative bg-white border rounded-full flex-row items-center px-4 py-2.5" style={{ borderColor: lightGrayColor }}>
                <Ionicons name="search-outline" size={16} color={steelGrayColor} className="mr-2" />
                <TextInput
                  className="flex-grow font-inter text-xs py-0 outline-none"
                  style={{ color: primaryColor }}
                  placeholder="Search staff..."
                  placeholderTextColor={steelGrayColor}
                  value={searchVal}
                  onChangeText={setSearchVal}
                />
                {searchVal.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchVal("")}>
                    <Ionicons name="close-circle" size={16} color={steelGrayColor} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isLoading ? (
              renderSkeletons()
            ) : error ? (
              <View style={{ backgroundColor: whiteColor, borderRadius: 24, marginTop: 16 }}>
                <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
                  <Ionicons name="alert-circle-outline" size={40} color={dangerColor} />
                  <Text className="font-poppins-semibold text-sm mt-2 text-center" style={{ color: primaryColor }}>{error}</Text>
                  <TouchableOpacity onPress={() => loadAttendanceData()} className="mt-4 px-6 py-2 rounded-xl" style={{ backgroundColor: primaryColor }}>
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
                    <View style={{ flex: 1, backgroundColor: primaryColor, borderRadius: 24 }}>
                      <View className="p-4 rounded-3xl border flex-1" style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
                        <Text 
                          className="font-poppins-bold text-[9px] uppercase tracking-widest"
                          style={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          Dept Average
                        </Text>
                        <Text className="font-poppins-bold text-2xl mt-2" style={{ color: secondaryColor }}>
                          {staffSummary.monthlyAvg}%
                        </Text>
                        <View className="flex-row items-center space-x-1 mt-1">
                          <Ionicons name="checkmark-circle" size={12} color={successColor} />
                          <Text className="font-inter-semibold text-[9px] font-bold" style={{ color: successColor }}>
                            Attendance is stable
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right Card: Staff On Leave Today */}
                    <View style={{ flex: 1, backgroundColor: whiteColor, borderRadius: 24 }}>
                      <View className="bg-white p-4 rounded-3xl border border-gray-100 flex-1">
                        <Text className="font-poppins-bold text-[9px] uppercase tracking-widest" style={{ color: steelGrayColor }}>
                          On Leave Today
                        </Text>
                        <Text className="font-poppins-bold text-2xl mt-2" style={{ color: primaryColor }}>
                          {String(staffSummary.staffOnLeaveToday).padStart(2, "0")}
                        </Text>
                        <Text className="font-inter text-[9px] mt-1" style={{ color: steelGrayColor }}>
                          Active planned leaves
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Staff List Section */}
                <View className="mt-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }}>
                      Staff List
                    </Text>
                    <TouchableOpacity onPress={() => console.log("Navigating to view all teachers")}>
                      <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Staff Cards */}
                  {filteredStaff.length === 0 ? (
                    <Text className="text-center py-6 text-xs font-inter italic" style={{ color: steelGrayColor }}>
                      No matching staff found.
                    </Text>
                  ) : (
                    filteredStaff.map((item, index) => {
                      const percent = Number(item.attendancePercent) || 0;
                      let badgeStyle = {};
                      let badgeTextColor = steelGrayColor;

                      if (item.status === "excellent") {
                        badgeStyle = { borderColor: `${successColor}80`, backgroundColor: `${successColor}1A` };
                        badgeTextColor = successColor;
                      } else if (item.status === "leadership") {
                        badgeStyle = { borderColor: `${primaryAltColor}80`, backgroundColor: `${primaryAltColor}1A` };
                        badgeTextColor = primaryAltColor;
                      } else if (item.status === "warning") {
                        badgeStyle = { borderColor: `${secondaryColor}4D`, backgroundColor: `${secondaryColor}0D` };
                        badgeTextColor = secondaryColor;
                      } else if (item.status === "critical") {
                        badgeStyle = { borderColor: `${dangerColor}80`, backgroundColor: `${dangerColor}1A` };
                        badgeTextColor = dangerColor;
                      }

                      return (
                        <View 
                          key={item.teacherId ?? index} 
                          style={{ backgroundColor: whiteColor, borderRadius: 24, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: lightGrayColor }}
                        >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center space-x-3 flex-1">
                                {/* Gold Initials Avatar */}
                                <View className="w-10 h-10 rounded-full items-center justify-center border" style={{ backgroundColor: `${secondaryColor}1A`, borderColor: `${secondaryColor}73` }}>
                                  <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                                    {item.initials}
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text className="font-poppins-bold text-xs leading-tight" style={{ color: primaryColor }}>
                                    {item.teacherName}
                                  </Text>
                                  <Text className="text-[10px] font-inter mt-0.5 font-semibold" style={{ color: steelGrayColor }}>
                                    {item.subject}
                                  </Text>
                                  <Text className="text-[9px] font-inter mt-0.5" style={{ color: steelGrayColor }}>
                                    Attended {item.presentDays}/{item.totalDays} days
                                  </Text>
                                </View>
                              </View>

                              {/* Badge */}
                              <View
                                className="px-2.5 py-1 rounded-lg border"
                                style={badgeStyle}
                              >
                                <Text className="font-poppins-bold text-[8.5px] uppercase tracking-wider" style={{ color: badgeTextColor }}>
                                  {item.status}
                                </Text>
                              </View>
                            </View>

                            {/* Gold Progress Bar */}
                            <View className="flex-row items-center space-x-2 mt-3">
                              <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: secondaryColor }} />
                              </View>
                              <Text className="font-poppins-bold text-[10px]" style={{ color: primaryColor }}>
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
                  <View style={{ backgroundColor: `${secondaryColor}15`, borderRadius: 24, marginTop: 20 }}>
                    <View className="p-5 rounded-3xl border flex-row space-x-3 items-start" style={{ backgroundColor: `${secondaryColor}15`, borderColor: `${secondaryColor}33` }}>
                      <View className="p-2 rounded-xl" style={{ backgroundColor: secondaryColor }}>
                        <Ionicons name="bulb" size={16} color="white" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
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
            <View style={{ borderRadius: 24, marginBottom: 16 }}>
              <View className="bg-white rounded-3xl p-5 border border-gray-100 flex-row justify-between items-center">
                <TouchableOpacity onPress={() => adjustDailyDate(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded-full">
                  <Ionicons name="chevron-back" size={18} color={primaryColor} />
                </TouchableOpacity>
                
                <View className="items-center flex-1">
                  <Text className="font-poppins-bold text-xs uppercase tracking-widest" style={{ color: steelGrayColor }}>
                    Selected Date
                  </Text>
                  <Text className="font-poppins-bold text-sm mt-1 text-center" style={{ color: primaryColor }}>
                    {formatDailyDate(dailySelectedDate)}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => adjustDailyDate(1)} className="p-2 bg-slate-50 border border-slate-200 rounded-full">
                  <Ionicons name="chevron-forward" size={18} color={primaryColor} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={{ backgroundColor: whiteColor, borderRadius: 9999, marginBottom: 16 }}>
              <View style={{ borderColor: lightGrayColor }} className="relative bg-white border rounded-full flex-row items-center px-4 py-2.5">
                <Ionicons name="search-outline" size={16} color={steelGrayColor} className="mr-2" />
                <TextInput
                  className="flex-grow font-inter text-xs py-0 outline-none"
                  style={{ color: primaryColor }}
                  placeholder="Search classes or sections..."
                  placeholderTextColor={steelGrayColor}
                  value={searchVal}
                  onChangeText={setSearchVal}
                />
                {searchVal.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchVal("")}>
                    <Ionicons name="close-circle" size={16} color={steelGrayColor} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isDailyLoading ? (
              renderSkeletons()
            ) : dailyError ? (
              <View style={{ backgroundColor: whiteColor, borderRadius: 24, marginTop: 16 }}>
                <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
                  <Ionicons name="alert-circle-outline" size={40} color={dangerColor} />
                  <Text className="font-poppins-semibold text-sm mt-2 text-center" style={{ color: primaryColor }}>{dailyError}</Text>
                  <TouchableOpacity onPress={() => refetchDaily()} className="mt-4 px-6 py-2 rounded-xl" style={{ backgroundColor: primaryColor }}>
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
                      <View style={{ flex: 1, backgroundColor: primaryColor, borderRadius: 24 }}>
                        <View className="p-4 rounded-3xl border flex-1" style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
                          <Text
                            className="font-poppins-bold text-[9px] uppercase tracking-widest"
                            style={{ color: "rgba(255, 255, 255, 0.7)" }}
                          >
                            Institution Rate
                          </Text>
                          <Text className="font-poppins-bold text-2xl mt-2" style={{ color: secondaryColor }}>
                            {overallPercent}%
                          </Text>
                          <Text className="font-inter text-[9px] mt-1 font-semibold" style={{ color: successColor }}>
                            Active Students
                          </Text>
                        </View>
                      </View>

                      {/* Card 2: Student Counts */}
                      <View style={{ flex: 1, backgroundColor: whiteColor, borderRadius: 24 }}>
                        <View className="bg-white p-4 rounded-3xl border border-gray-100 flex-1">
                          <Text className="font-poppins-bold text-[9px] uppercase tracking-widest" style={{ color: steelGrayColor }}>
                            Present / Absent
                          </Text>
                          <Text className="font-poppins-bold text-lg mt-2" style={{ color: primaryColor }}>
                            {totalPresent} / {totalStudents}
                          </Text>
                          <Text className="font-inter text-[9px] mt-1 font-semibold" style={{ color: dangerColor }}>
                            {totalAbsent} Absent Today
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Class Breakdown List */}
                <View className="mt-4">
                  <Text className="font-poppins-bold text-sm mb-3" style={{ color: primaryColor }}>
                    Class Breakdown
                  </Text>

                  {filteredDailyBreakdown.length === 0 ? (
                    <Text className="text-center py-6 text-xs font-inter italic" style={{ color: steelGrayColor }}>
                      No matching classes found.
                    </Text>
                  ) : (
                    filteredDailyBreakdown.map((item) => {
                      const percent = item.totalCount > 0 ? Math.round((item.presentCount / item.totalCount) * 100) : 0;
                      
                      // Status check based on attendance percent
                      let status = "critical";
                      let badgeStyle = { borderColor: `${dangerColor}80`, backgroundColor: `${dangerColor}1A` };
                      let badgeTextColor = dangerColor;
                      
                      if (percent >= 90) {
                        status = "excellent";
                        badgeStyle = { borderColor: `${successColor}80`, backgroundColor: `${successColor}1A` };
                        badgeTextColor = successColor;
                      } else if (percent >= 80) {
                        status = "warning";
                        badgeStyle = { borderColor: `${secondaryColor}4D`, backgroundColor: `${secondaryColor}0D` };
                        badgeTextColor = secondaryColor;
                      }
                      
                      return (
                        <View 
                          key={`${item.classId}-${item.sectionId}`} 
                          style={{ backgroundColor: whiteColor, borderRadius: 24, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: lightGrayColor }}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center space-x-3 flex-1">
                              <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
                                <Ionicons name="school-outline" size={18} color={steelGrayColor} />
                              </View>
                              <View className="flex-1">
                                <Text className="font-poppins-bold text-xs leading-tight" style={{ color: primaryColor }}>
                                  {item.className} - {item.sectionName}
                                </Text>
                                <Text className="text-[10px] font-inter mt-0.5" style={{ color: steelGrayColor }}>
                                  Present: {item.presentCount}/{item.totalCount} | Absent: {item.absentCount}
                                </Text>
                              </View>
                            </View>

                            <View className="px-2.5 py-1 rounded-lg border" style={badgeStyle}>
                              <Text className="font-poppins-bold text-[8.5px] uppercase tracking-wider" style={{ color: badgeTextColor }}>
                                {status}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center space-x-2 mt-3">
                            <View className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: secondaryColor }} />
                            </View>
                            <Text className="font-poppins-bold text-[10px]" style={{ color: primaryColor }}>
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

const SHADOWS = {
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
};
