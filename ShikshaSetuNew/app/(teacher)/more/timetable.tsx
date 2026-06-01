import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";

// ─── Custom Skeleton Loader ───────────────────
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

function TimetableSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      <View className="flex-row space-x-2.5 mb-6 justify-between">
        <SkeletonBox width="15%" height={36} borderRadius={9999} />
        <SkeletonBox width="15%" height={36} borderRadius={9999} />
        <SkeletonBox width="15%" height={36} borderRadius={9999} />
        <SkeletonBox width="15%" height={36} borderRadius={9999} />
        <SkeletonBox width="15%" height={36} borderRadius={9999} />
        <SkeletonBox width="15%" height={36} borderRadius={9999} />
      </View>
      <SkeletonBox height={80} borderRadius={12} style={{ marginBottom: 12 }} />
      <SkeletonBox height={80} borderRadius={12} style={{ marginBottom: 12 }} />
      <SkeletonBox height={80} borderRadius={12} style={{ marginBottom: 12 }} />
    </View>
  );
}

const DAY_MAP = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const TABS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
];

interface TimetableItem {
  id: string;
  day: string;
  period_number: number;
  starts_at: string;
  ends_at: string;
  room: string | null;
  class_name: string;
  section_name: string;
  subject_name: string;
}

export default function MyTimetableScreen() {
  const router = useRouter();
  const { userId, isLoaded, isSignedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);

  useEffect(() => {
    // Set active day on mount
    const todayNum = new Date().getDay();
    const todayName = DAY_MAP[todayNum];
    if (todayName === "sunday") {
      setSelectedDay("monday");
    } else {
      setSelectedDay(todayName);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      loadTimetable();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch teacher info using user_id
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error loading teacher:", teacherErr);
        setError("Could not load teacher profile");
        setLoading(false);
        return;
      }

      // 2. Fetch timetable records
      const { data: rawData, error: timetableErr } = await supabase
        .from("timetable")
        .select(`
          id,
          day,
          period_number,
          starts_at,
          ends_at,
          room,
          section_id,
          section:sections!inner (
            id,
            name,
            class:classes!inner (
              id,
              name
            )
          ),
          class_subjects:class_subjects!inner (
            id,
            teacher_id,
            subject:subjects!inner (
              id,
              name
            )
          )
        `);

      if (timetableErr) {
        console.error("Error fetching timetable:", timetableErr);
        setError("Failed to fetch timetable records");
        setLoading(false);
        return;
      }

      // 3. Filter raw data to only matching teacher's class_subjects.teacher_id
      const teacherUserId = teacherData.user_id;
      const teacherRows = (rawData || []).filter((row: any) => {
        const cs = Array.isArray(row.class_subjects)
          ? row.class_subjects[0]
          : row.class_subjects;
        return cs && cs.teacher_id === teacherUserId;
      });

      // 4. Deduplicate entries by (day, period_number, section_id) BEFORE filtering by selected day
      const seen = new Set();
      const uniquePeriods = teacherRows.filter((row: any) => {
        const key = `${row.day}-${row.period_number}-${row.section_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 5. Map to cleaner items
      const mappedTimetable: TimetableItem[] = uniquePeriods.map((row: any) => {
        const sec = Array.isArray(row.section) ? row.section[0] : row.section;
        const cls = sec ? (Array.isArray(sec.class) ? sec.class[0] : sec.class) : null;
        const cs = Array.isArray(row.class_subjects)
          ? row.class_subjects[0]
          : row.class_subjects;
        const sub = cs ? (Array.isArray(cs.subject) ? cs.subject[0] : cs.subject) : null;

        return {
          id: row.id,
          day: row.day,
          period_number: row.period_number,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          room: row.room,
          class_name: cls?.name || "Unknown Class",
          section_name: sec?.name || "",
          subject_name: sub?.name || "Unknown Subject",
        };
      });

      setTimetable(mappedTimetable);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load timetable:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  // Helper to format time (e.g., "09:00:00" -> "09:00 AM")
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    return `${hour}:${minute} ${ampm}`;
  };

  // Filter client-side by selected day
  const filteredPeriods = timetable
    .filter((p) => p.day === selectedDay)
    .sort((a, b) => a.period_number - b.period_number);

  const getDayNameTitleCase = (dayKey: string) => {
    return dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
  };

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      <Header title="My Timetable" showBack={true} onBack={() => router.back()} />

      {loading ? (
        <TimetableSkeleton />
      ) : error ? (
        <View className="mx-4 mt-6 bg-red-50 p-4 rounded-xl border border-red-200 flex-row items-center justify-between">
          <Text className="font-inter text-red-700 text-sm flex-1 mr-2">{error}</Text>
          <TouchableOpacity
            onPress={() => loadTimetable()}
            className="bg-white border border-red-300 px-3 py-1.5 rounded-lg"
          >
            <Text className="font-inter-medium text-red-700 text-xs">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1">
          {/* Day Selector horizontal pills */}
          <View className="my-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                gap: 8,
                alignItems: "center",
              }}
              style={{ flexGrow: 0 }}
            >
              {TABS.map((tab) => {
                const isSelected = selectedDay === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setSelectedDay(tab.id)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 9999,
                      backgroundColor: isSelected ? "#D4AF37" : "#FFFFFF",
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: "#0D1B2A",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#0D1B2A",
                      }}
                      className={isSelected ? "font-poppins-semibold" : "font-poppins-medium"}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Period Cards Scroll */}
          <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {filteredPeriods.length === 0 ? (
              <View className="items-center justify-center py-16">
                <Feather name="calendar" size={48} color="#D4AF37" />
                <Text
                  style={{ fontFamily: "Poppins-SemiBold" }}
                  className="text-sm font-bold text-[#0D1B2A] mt-4"
                >
                  No classes on {getDayNameTitleCase(selectedDay)}
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {filteredPeriods.map((period) => (
                  <View
                    key={period.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: "#D4AF37",
                      shadowColor: "rgba(0,0,0,0.04)",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 2,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                    className="border border-gray-100"
                  >
                    {/* Left column */}
                    <View className="items-start pr-3 border-r border-[#E4E2E1]">
                      <Text
                        style={{ fontFamily: "Poppins-Bold" }}
                        className="text-[13px] font-bold text-[#0D1B2A]"
                      >
                        Period {period.period_number}
                      </Text>
                      <Text
                        style={{ fontFamily: "OpenSans" }}
                        className="text-[10px] text-[#D4AF37] font-bold mt-0.5"
                      >
                        {formatTime(period.starts_at)} - {formatTime(period.ends_at)}
                      </Text>
                    </View>

                    {/* Right column */}
                    <View className="flex-1 pl-3">
                      <Text
                        style={{ fontFamily: "Poppins-SemiBold" }}
                        className="text-[14px] font-bold text-[#0D1B2A]"
                        numberOfLines={1}
                      >
                        {period.subject_name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text
                          style={{ fontFamily: "Inter-Regular" }}
                          className="text-[12px] text-[#44474C]"
                        >
                          {period.class_name} - {period.section_name}
                        </Text>
                        {period.room && (
                          <Text
                            style={{ fontFamily: "Inter-Regular" }}
                            className="text-[12px] text-[#44474C] ml-3"
                          >
                            📍 Room {period.room}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
