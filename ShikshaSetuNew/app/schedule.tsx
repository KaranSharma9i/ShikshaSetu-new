import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Linking,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import {
  getStudentProfileByUserId,
  getStudentScheduleData,
  getUpcomingExams,
  getStudentAcademicYear,
} from "@/src/repositories/studentRepository";
import Header from "@/components/student/Header";
import BottomNavBar from "@/components/student/BottomNavBar";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface Leave {
  id: string;
  from_date: string;
  to_date: string;
  status: string;
}

interface Attendance {
  date: string;
  status: string;
}

interface UpcomingExam {
  id: string;
  title: string;
  subject_name: string;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  syllabus_file_url: string | null;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

// Get all days in a month
function getDaysInMonth(year: number, month: number): Date[] {
  const days = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Get day type for calendar dot
type DayType = 'holiday' | 'leave' | 'present' | 
               'absent' | 'today' | 'future' | 'none'

function getDayType(
  date: Date,
  holidays: Holiday[],
  leaves: Leave[],
  attendance: Attendance[]
): DayType {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Check holiday
  if (holidays.some(h => h.date === dateStr)) 
    return 'holiday';
  
  // Check leave (approved, within range)
  if (leaves.some(l => 
    dateStr >= l.from_date && dateStr <= l.to_date
  )) return 'leave';
  
  if (dateStr === today) return 'today';
  
  // Set times to midnight to safely compare future days
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dateStart > todayStart) return 'future';
  
  // Check attendance
  const att = attendance.find(a => a.date === dateStr);
  if (att?.status === 'present') return 'present';
  if (att?.status === 'absent') return 'absent';
  
  return 'none';
}

// Format exam time
function formatExamTime(time: string | null): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const [h, m] = parts;
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

// Format exam date beautifully
function formatExamDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Skeleton Loader Component ───────────────────────────────────────────────

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E5E7EB",
          opacity,
        },
        style,
      ]}
    />
  );
}

function ScheduleSkeleton() {
  return (
    <View className="flex-1 bg-[#F9F6EF] px-5 py-4">
      {/* Calendar Card Skeleton */}
      <SkeletonBox width="100%" height={320} borderRadius={16} style={{ marginBottom: 24 }} />
      {/* Section Title Skeleton */}
      <SkeletonBox width={150} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
      {/* Exam Cards Skeletons */}
      <SkeletonBox width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const { user, isLoaded, isSignedIn, role, theme } = useAuth();
  
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#ffe088";
  const creamColor = theme?.colors?.cream ?? "#F9F6EF";
  const dangerColor = theme?.colors?.danger ?? "#ba1a1a";

  const [student, setStudent] = useState<any>(null);
  const [academicYear, setAcademicYear] = useState<{ id: string; starts_on: string; ends_on: string } | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Data States
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCalendarLoading, setIsCalendarLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load Student Profile & Academic Year ───────────────────────────────────
  const loadInitialData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      setError(null);

      // Fetch student profile (class_id resolves via enrollment join)
      const profile = await getStudentProfileByUserId(user.id);
      if (!profile) {
        setError("Student profile not found.");
        setIsLoading(false);
        return;
      }
      setStudent(profile);

      // Fetch current academic year
      if (profile.institution_id) {
        const ay = await getStudentAcademicYear(profile.institution_id);
        if (ay) {
          setAcademicYear(ay);
          
          // Fetch upcoming exams once
          if (profile.class_id) {
            const exams = await getUpcomingExams(profile.class_id, ay.id);
            setUpcomingExams(exams);
          }
        }
      }
    } catch (err: any) {
      console.error("Error loading initial data:", err);
      setError(err?.message || "Failed to load schedule data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      loadInitialData();
    }
  }, [isLoaded, isSignedIn, user?.id]);

  // ── Fetch Calendar Data on Month/Profile Change ────────────────────────────
  const fetchCalendarData = async () => {
    if (!student || !academicYear) return;
    try {
      setIsCalendarLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // 1-12

      const scheduleData = await getStudentScheduleData(
        student.id,
        student.class_id,
        student.institution_id,
        academicYear.id,
        month,
        year
      );

      setHolidays(scheduleData.holidays || []);
      setLeaves(scheduleData.leaves || []);
      setAttendance(scheduleData.attendance || []);
    } catch (err) {
      console.error("Error fetching calendar data:", err);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (student && academicYear) {
      fetchCalendarData();
    }
  }, [student, academicYear, currentMonth]);

  // ── Month Navigation Limits ────────────────────────────────────────────────
  const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  // Allow free navigation to any month
  const isPrevDisabled = false;
  const isNextDisabled = false;

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // ── Calendar Math & Rendering ──────────────────────────────────────────────
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-11
  
  // Format Month Year centered title
  const monthLabel = currentMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const days = getDaysInMonth(year, month + 1);
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

  // Empty view spacers for starting day offset
  const spacers = Array(startOffset).fill(null);

  const renderCalendarGrid = () => {
    return (
      <View className="flex-row flex-wrap">
        {/* Render Day Spacers */}
        {spacers.map((_, index) => (
          <View key={`spacer-${index}`} className="w-[14.28%] h-10 items-center justify-center" />
        ))}

        {/* Render Actual Month Days */}
        {days.map((day) => {
          const type = getDayType(day, holidays, leaves, attendance);
          const dayNum = day.getDate();
          
          let circleBgStyle = {};
          let textColorClass = "font-inter";
          let textColor = primaryColor;

          switch (type) {
            case "today":
              circleBgStyle = { backgroundColor: primaryColor };
              textColorClass = "font-inter-semibold";
              textColor = "#FFFFFF";
              break;
            case "holiday":
              circleBgStyle = { backgroundColor: "black" };
              textColorClass = "font-inter-semibold";
              textColor = "#FFFFFF";
              break;
            case "leave":
              circleBgStyle = { backgroundColor: secondaryColor };
              textColorClass = "font-inter-semibold";
              textColor = primaryColor;
              break;
            case "present":
              circleBgStyle = { backgroundColor: "#F3F4F6" };
              textColorClass = "font-inter-medium";
              textColor = primaryColor;
              break;
            case "absent":
              circleBgStyle = { backgroundColor: "#FFF0F0" };
              textColorClass = "font-inter-medium";
              textColor = "#DC2626";
              break;
            case "future":
              textColorClass = "font-inter";
              textColor = "#9CA3AF";
              break;
            case "none":
            default:
              textColorClass = "font-inter";
              textColor = "#D1D5DB";
              break;
          }

          return (
            <View key={day.toISOString()} className="w-[14.28%] h-12 items-center justify-center">
              <View 
                className="w-9 h-9 rounded-full items-center justify-center"
                style={circleBgStyle}
              >
                <Text 
                  className={`text-sm ${textColorClass}`}
                  style={{ color: textColor }}
                >
                  {dayNum}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Main UI Layout ─────────────────────────────────────────────────────────
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: creamColor }}>
        {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}
        <Header />
        <ScheduleSkeleton />
        <BottomNavBar />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1" style={{ backgroundColor: creamColor }}>
        {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}
        <Header />
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning-outline" size={48} color={dangerColor} />
          <Text className="font-poppins-semibold text-lg text-neutral-charcoal text-center mt-3">
            Something went wrong
          </Text>
          <Text className="font-inter text-sm text-neutral-steel text-center mt-1.5 mb-6">
            {error}
          </Text>
          <TouchableOpacity
            onPress={loadInitialData}
            style={{ backgroundColor: primaryColor }}
            className="px-7 py-3 rounded-full"
            activeOpacity={0.8}
          >
            <Text className="font-poppins-bold text-white text-sm">Try Again</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: creamColor }}>
      {/* Status bar padding for Android */}
      {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}

      <Header studentName={student?.full_name} profilePhotoUrl={student?.profile_photo_url} />

      <ScrollView className="flex-1 px-5 py-4" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        
        {/* ── Academic Calendar Heading ── */}
        <Text className="font-poppins-semibold text-xl mb-3" style={{ color: primaryColor }}>
          Academic Calendar
        </Text>

        {/* ── Month Navigation Row ── */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            onPress={handlePrevMonth}
            disabled={isPrevDisabled}
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isPrevDisabled ? "#9CA3AF" : primaryColor}
            />
          </TouchableOpacity>

          <Text className="font-poppins-medium text-base capitalize" style={{ color: primaryColor }}>
            {monthLabel}
          </Text>

          <TouchableOpacity
            onPress={handleNextMonth}
            disabled={isNextDisabled}
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isNextDisabled ? "#9CA3AF" : primaryColor}
            />
          </TouchableOpacity>
        </View>

        {/* ── Calendar Grid Card ── */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          {isCalendarLoading ? (
            <View className="h-64 items-center justify-center">
              <SkeletonBox width="100%" height={240} borderRadius={12} />
            </View>
          ) : (
            <View>
              {/* Day Headers (S M T W T F S) */}
              <View className="flex-row mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                  <Text
                    key={`header-${idx}`}
                    className="w-[14.28%] text-center font-inter text-xs text-gray-400 py-1"
                  >
                    {day}
                  </Text>
                ))}
              </View>

              {/* Day Cells Grid */}
              {renderCalendarGrid()}

              {/* Legend Row */}
              <View className="flex-row justify-evenly items-center mt-5 border-t border-gray-50 pt-4">
                <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: secondaryColor }} />
                  <Text className="font-inter text-xs text-gray-500">Leaves</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-black mr-1.5" />
                  <Text className="font-inter text-xs text-gray-500">Holidays</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-gray-300 mr-1.5" />
                  <Text className="font-inter text-xs text-gray-500">School Days</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Upcoming Exams Heading Row ── */}
        <View className="flex-row items-center mb-4">
          <View className="w-[4px] h-[20px] rounded-full mr-2" style={{ backgroundColor: secondaryColor }} />
          <Text className="font-poppins-semibold text-lg mb-3" style={{ color: primaryColor }}>
            Upcoming Exams
          </Text>
        </View>

        {/* ── Upcoming Exams List ── */}
        {upcomingExams.length === 0 ? (
          <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center justify-center">
            <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
            <Text className="font-inter text-gray-400 text-sm text-center mt-2">
              No upcoming exams
            </Text>
          </View>
        ) : (
          upcomingExams.map((exam) => {
            const timeFormatted = formatExamTime(exam.start_time);
            
            // Dynamic icon mapping based on venue string
            let venueIcon: any = "location-outline";
            if (exam.venue?.toLowerCase().includes("lab")) {
              venueIcon = "flask-outline";
            } else if (exam.venue?.toLowerCase().includes("hall")) {
              venueIcon = "business-outline";
            }

            const handleSyllabusPress = () => {
              if (!exam.syllabus_file_url) {
                Alert.alert("Syllabus", "Syllabus will be available soon");
              } else {
                Linking.openURL(exam.syllabus_file_url).catch((err) => {
                  console.error("Failed to open syllabus link:", err);
                  Alert.alert("Error", "Could not open syllabus link");
                });
              }
            };

            const handleDetailsPress = () => {
              Alert.alert("Exam Details", "Exam details coming soon");
            };

            return (
              <View
                key={exam.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3"
              >
                {/* Exam Title & Syllabus Badge */}
                <View className="flex-row justify-between items-start mb-2.5">
                  <View className="flex-1 mr-3">
                    <Text className="font-poppins-semibold text-base leading-tight" style={{ color: primaryColor }}>
                      {exam.title}
                    </Text>
                    <Text className="font-inter text-xs text-gray-400 mt-0.5">
                      {exam.subject_name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleSyllabusPress}
                    style={{ borderColor: secondaryColor }}
                    className="border bg-transparent rounded-full px-2.5 py-0.5"
                    activeOpacity={0.7}
                  >
                    <Text className="font-poppins-semibold text-[10px]" style={{ color: secondaryColor }}>
                      Syllabus
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Divider Line */}
                <View className="h-[1px] bg-[#F3F4F6]" />

                {/* Date/Time Row */}
                <View className="flex-row items-center py-2.5">
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text className="font-inter text-xs text-gray-500 ml-2">
                    {formatExamDate(exam.exam_date)}
                    {timeFormatted ? ` | ${timeFormatted}` : ""}
                  </Text>
                </View>

                {/* Divider Line */}
                <View className="h-[1px] bg-[#F3F4F6]" />

                {/* Venue & Details Row */}
                <View className="flex-row justify-between items-center pt-2.5">
                  <View className="flex-row items-center flex-1 mr-3">
                    <Ionicons name={venueIcon} size={14} color="#6B7280" />
                    <Text className="font-inter text-xs text-gray-500 ml-2 flex-1" numberOfLines={1}>
                      {exam.venue || "TBD"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleDetailsPress} activeOpacity={0.7}>
                    <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                      Details →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Nav Bar */}
      <BottomNavBar />
    </View>
  );
}
