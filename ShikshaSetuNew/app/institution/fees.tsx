import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { useAuth } from "../../src/hooks/useAuth";
import { useQuery } from "../../src/hooks/useQuery";
import {
  getFeeCollectionSummary,
  getDefaultersList,
  sendReminder,
  sendRemindersToAll,
  DefaulterItem,
} from "../../src/repositories/feeRepository";
import { supabase } from "../../src/lib/supabase";

export default function FeesDashboard() {
  const { institutionId, theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#F2C14E";
  const creamColor = theme?.colors?.cream ?? "#F5F0E8";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";

  // Fetch the academic year ID for "2026-27"
  const { data: academicYear, isLoading: loadingAy, error: ayErr, refetch: refetchAy } = useQuery(async () => {
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

  const { data: stats, isLoading: loadingStats, error: statsErr, refetch: refetchStats } = useQuery(
    async () => {
      if (!institutionId || !academicYear) {
        return { totalCollected: 0, totalTarget: 0, completionPercent: 0 };
      }
      return getFeeCollectionSummary(institutionId, academicYear);
    },
    [institutionId, academicYear]
  );

  const { data: dbDefaulters, isLoading: loadingDefaulters, error: defaultersErr, refetch: refetchDefaulters } = useQuery(
    async () => {
      if (!institutionId || !academicYear) return [];
      return getDefaultersList(institutionId, academicYear);
    },
    [institutionId, academicYear]
  );

  const [defaulters, setDefaulters] = useState<DefaulterItem[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    if (dbDefaulters) {
      setDefaulters(dbDefaulters);
    }
  }, [dbDefaulters]);

  const handleSendReminder = async (student: DefaulterItem) => {
    try {
      const res = await sendReminder(student.studentId, student.feeStructureId);
      if (res.success) {
        Alert.alert(
          "Fee Reminder Sent",
          `A custom fee reminder notification has been broadcasted to ${student.studentName}'s registered guardian for the pending amount of ₹${student.pendingAmount.toLocaleString("en-IN")}.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", "Failed to send reminder. Please try again.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const handleBroadcastAll = async () => {
    if (!institutionId || !academicYear) return;
    setBroadcasting(true);
    try {
      const res = await sendRemindersToAll(institutionId, academicYear);
      setBroadcasting(false);
      Alert.alert(
        "Broadcast Success",
        `Fee reminders successfully broadcasted to all outstanding defaulters (${res.reminded} guardians notified).`,
        [{ text: "Great" }]
      );
      refetchDefaulters();
    } catch (err) {
      setBroadcasting(false);
      console.error(err);
      Alert.alert("Error", "Failed to broadcast reminders.");
    }
  };

  const handleRetry = () => {
    refetchAy();
    refetchStats();
    refetchDefaulters();
  };

  const formatRupees = (num: number) => {
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(1)} Lakhs`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return "30th May, 2026";
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();

    const suffix = (d: number) => {
      if (d > 3 && d < 21) return "th";
      switch (d % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    return `${day}${suffix(day)} ${month}, ${year}`;
  };

  const isPageLoading = loadingAy || loadingStats || loadingDefaulters;
  const hasPageError = !!ayErr || !!statsErr || !!defaultersErr;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="Finance & Fees" />

      {hasPageError ? (
        <View className="flex-grow justify-center items-center py-20 px-5">
          <Ionicons name="alert-circle-outline" size={48} color={dangerColor} />
          <Text className="font-poppins-semibold text-sm mt-3 text-center" style={{ color: primaryColor }}>
            Failed to load fee collection data
          </Text>
          <TouchableOpacity
            onPress={handleRetry}
            className="mt-4 px-6 py-2.5 rounded-xl"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="font-poppins-semibold text-xs" style={{ color: secondaryColor }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-grow"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Title */}
          <View className="px-5 pt-6 pb-2">
            <Text className="text-[11px] font-poppins-semibold tracking-widest uppercase mb-1" style={{ color: secondaryColor }}>
              Accounts & Billing
            </Text>
            <Text className="text-2xl font-poppins-bold leading-tight" style={{ color: primaryColor }}>
              Fee Collection
            </Text>
          </View>

          {/* Financial Highlights Panel */}
          <View className="px-5 mb-6">
            <View className="p-5 rounded-3xl border-2 shadow-md" style={{ backgroundColor: primaryColor, borderColor: `${secondaryColor}66` }}>
              <Text className="text-slate-400 font-inter text-[10px] uppercase tracking-wider">
                Total Term Collection (Term 1)
              </Text>
              {isPageLoading ? (
                <ActivityIndicator size="small" color={secondaryColor} className="my-6" />
              ) : (
                <>
                  <Text className="text-white font-poppins-bold text-3xl mt-1">
                    {formatRupees(stats?.totalCollected ?? 0)}
                  </Text>
                  <View className="w-full bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${stats?.completionPercent ?? 0}%`, backgroundColor: secondaryColor }}
                    />
                  </View>
                  <View className="flex-row justify-between items-center mt-3">
                    <Text className="text-slate-300 font-inter text-[11px]">
                      Target: {formatRupees(stats?.totalTarget ?? 0)}
                    </Text>
                    <Text className="font-poppins-bold text-[11px]" style={{ color: secondaryColor }}>
                      {(stats?.completionPercent ?? 0).toFixed(1)}% Completed
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Action Button: Broadcast all */}
          <View className="px-5 mb-6">
            <TouchableOpacity
              onPress={handleBroadcastAll}
              disabled={broadcasting || isPageLoading}
              className="py-4 rounded-xl items-center flex-row justify-center space-x-2 border"
              style={{ backgroundColor: secondaryColor, borderColor: secondaryColor }}
            >
              <Ionicons name="mail-unread-outline" size={18} color={primaryColor} />
              <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }}>
                {broadcasting ? "Broadcasting Reminders..." : "Send Reminders to All"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Defaulters Section */}
          <View className="px-5">
            <Text className="font-poppins-bold text-base mb-3 px-1" style={{ color: primaryColor }}>
              Outstanding Defaulters List
            </Text>

            {isPageLoading ? (
              <ActivityIndicator size="small" color={secondaryColor} className="my-10" />
            ) : defaulters.length === 0 ? (
              <Text className="text-center text-xs text-neutral-steel font-inter italic my-10">
                No outstanding defaulters.
              </Text>
            ) : (
              defaulters.map((student) => {
                const isOverdue = student.status === "overdue";
                const badgeColor = isOverdue ? dangerColor : secondaryColor;
                
                return (
                  <View
                    key={student.studentId}
                    className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm mb-4"
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View>
                        <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }}>
                          {student.studentName}
                        </Text>
                        <Text className="text-[10px] text-neutral-steel">
                          Grade {student.className.replace("Class ", "")}-{student.section}
                        </Text>
                      </View>

                      <View
                        className="px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${badgeColor}0D`,
                          borderColor: `${badgeColor}33`
                        }}
                      >
                        <Text
                          className="font-poppins-semibold text-[8px] uppercase tracking-wide"
                          style={{ color: badgeColor }}
                        >
                          {student.status}
                        </Text>
                      </View>
                    </View>

                    {/* Fee info row */}
                    <View className="flex-row justify-between items-center border-t border-gray-50 pt-3">
                      <View>
                        <Text className="text-[9px] text-[#778598] font-inter">Pending Amount</Text>
                        <Text className="font-poppins-bold text-sm" style={{ color: dangerColor }}>
                          {formatRupees(student.pendingAmount)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[9px] text-[#778598] font-inter">Deadline Date</Text>
                        <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }}>
                          {formatDueDate(student.dueDate)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleSendReminder(student)}
                        className="px-3.5 py-2 rounded-xl"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Text className="font-poppins-semibold text-[10px]" style={{ color: secondaryColor }}>
                          Remind
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* Bottom navbar navigation active utilities */}
      <BottomNavBar activeTab="utilities" />
    </SafeAreaView>
  );
}
