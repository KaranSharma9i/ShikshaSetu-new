import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { useStudentDashboard } from "@/hooks/useStudentDashboard";
import Header from "@/components/student/Header";
import BottomNavBar from "@/components/student/BottomNavBar";
import CircularProgress from "@/components/student/CircularProgress";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatExamDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

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

function DashboardSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F9F6EF", padding: 20 }}>
      {/* Hero card skeleton */}
      <SkeletonBox width="100%" height={160} borderRadius={20} style={{ marginBottom: 16 }} />
      {/* Fee banner skeleton */}
      <SkeletonBox width="100%" height={60} borderRadius={14} style={{ marginBottom: 16 }} />
      {/* Performance card skeleton */}
      <SkeletonBox width="100%" height={140} borderRadius={20} style={{ marginBottom: 16 }} />
      {/* Quick actions skeleton */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <SkeletonBox width="47%" height={90} borderRadius={16} />
        <SkeletonBox width="47%" height={90} borderRadius={16} />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <SkeletonBox width="47%" height={90} borderRadius={16} />
        <SkeletonBox width="47%" height={90} borderRadius={16} />
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Index() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user, signOut, role } = useAuth();

  const {
    student,
    upcomingExam,
    pendingFee,
    stats,
    circulars,
    isLoading,
    error,
    refetch,
  } = useStudentDashboard();

  // ── Redirect logic ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/onboarding");
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn && role) {
      if (role === "institution_admin") {
        router.replace("/institution");
      } else if (role === "teacher") {
        router.replace("/teachers" as any);
      }
    }
  }, [isLoaded, isSignedIn, role]);

  // ── Loading / gate states ───────────────────────────────────────────────────
  if (!isLoaded || !isSignedIn) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#F9F6EF", justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#D4AF37" />
      </SafeAreaView>
    );
  }

  // Redirect non-students
  if (role && role !== "student") {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#F9F6EF", justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#D4AF37" />
      </SafeAreaView>
    );
  }

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  // ── Total pending fee amount ────────────────────────────────────────────────
  const totalPending = pendingFee?.pending_amount ?? 0;
  const hasPendingFee = totalPending > 0;

  // ── Quick actions ───────────────────────────────────────────────────────────
  const quickActions = [
    { label: "Homework", icon: "document-text-outline" as const, route: "/homework", color: "#2563EB", bg: "#EFF6FF" },
    { label: "Report Card", icon: "ribbon-outline" as const, route: "/report-card", color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Circulars", icon: "megaphone-outline" as const, route: "/circulars", color: "#0891B2", bg: "#ECFEFF" },
    { label: "Schedule", icon: "calendar-outline" as const, route: "/schedule", color: "#059669", bg: "#ECFDF5" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F9F6EF" }}>
      {/* Status bar padding for Android */}
      {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}

      {/* Header */}
      <Header
        studentName={student?.full_name}
        profilePhotoUrl={student?.profile_photo_url}
      />

      {/* Body */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
        >
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 16,
              color: "#111827",
              textAlign: "center",
              marginTop: 12,
            }}
          >
            Couldn't load dashboard
          </Text>
          <Text
            style={{
              fontFamily: "Inter-Regular",
              fontSize: 13,
              color: "#6B7280",
              textAlign: "center",
              marginTop: 6,
              marginBottom: 20,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={refetch}
            style={{
              backgroundColor: "#D4AF37",
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 100,
            }}
          >
            <Text style={{ fontFamily: "Poppins-Bold", color: "#0D1B2A", fontSize: 13 }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile Setup Pending Callout ────────────────────────── */}
          {!student && (
            <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 4 }}>
              <View
                style={{
                  backgroundColor: "#FFFBEB",
                  borderColor: "#FDE68A",
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <Ionicons name="alert-circle-outline" size={24} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 13,
                      color: "#92400E",
                    }}
                  >
                    Profile Setup Pending
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter-Regular",
                      fontSize: 11,
                      color: "#B45309",
                      marginTop: 2,
                    }}
                  >
                    Your student record is not fully set up. Please contact your school administrator to complete your profile registration.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Welcome Hero Card ─────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: student ? 20 : 10, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: "#0D1B2A",
                borderRadius: 24,
                padding: 20,
                overflow: "hidden",
              }}
            >
              {/* Top row: greeting + exam badge */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontFamily: "Inter-Regular", fontSize: 13, color: "#9CA3AF", marginBottom: 2 }}
                  >
                    Namaste 🙏
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 20,
                      color: "#FFFFFF",
                      lineHeight: 26,
                    }}
                    numberOfLines={2}
                  >
                    {student?.full_name || "Student"}
                  </Text>
                </View>

                {/* Upcoming Exam Badge */}
                {upcomingExam && (
                  <View
                    style={{
                      backgroundColor: "#ffe08820",
                      borderColor: "#ffe08840",
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 10,
                      alignItems: "center",
                      minWidth: 110,
                      maxWidth: 120,
                    }}
                  >
                    <Ionicons name="time-outline" size={14} color="#D4AF37" />
                    <Text
                      style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 9,
                        color: "#D4AF37",
                        textAlign: "center",
                        marginTop: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Next Exam
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter-Medium",
                        fontSize: 11,
                        color: "#FFFFFF",
                        textAlign: "center",
                        marginTop: 2,
                      }}
                      numberOfLines={2}
                    >
                      {upcomingExam.exam_name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter-Regular",
                        fontSize: 9,
                        color: "#9CA3AF",
                        textAlign: "center",
                        marginTop: 2,
                      }}
                    >
                      {formatExamDate(upcomingExam.exam_date)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#FFFFFF12",
                  marginVertical: 14,
                }}
              />

              {/* Class / Section / Roll info row */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {[
                  { icon: "school-outline" as const, label: student?.class_name || "—" },
                  { icon: "bookmark-outline" as const, label: `Sec ${student?.section_name || "—"}` },
                  {
                    icon: "id-card-outline" as const,
                    label: student?.roll_number
                      ? `Roll ${student.roll_number}`
                      : "Roll —",
                  },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#FFFFFF0D",
                      borderRadius: 100,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      gap: 5,
                    }}
                  >
                    <Ionicons name={item.icon} size={12} color="#D4AF37" />
                    <Text
                      style={{
                        fontFamily: "Inter-Medium",
                        fontSize: 11,
                        color: "#D1D5DB",
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* ── Pending Fee Banner ────────────────────────────────── */}
          {hasPendingFee && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: "#FFF5F5",
                  borderColor: "#FECACA",
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: "#FEE2E2",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="card-outline" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 13,
                      color: "#991B1B",
                    }}
                  >
                    Fee Due: {formatRupees(totalPending)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter-Regular",
                      fontSize: 11,
                      color: "#EF4444",
                      marginTop: 1,
                    }}
                  >
                    {pendingFee?.fee_name}
                    {pendingFee?.due_date
                      ? ` · Due ${formatExamDate(pendingFee.due_date)}`
                      : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/fees" as any)}
                  style={{
                    backgroundColor: "#DC2626",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 100,
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 11,
                      color: "#FFFFFF",
                    }}
                  >
                    Pay Now
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Academic Performance Card ─────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
                borderColor: "#F3F4F6",
                borderWidth: 1,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 18,
                  gap: 8,
                }}
              >
                <Ionicons name="bar-chart-outline" size={18} color="#D4AF37" />
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 14,
                    color: "#0D1B2A",
                  }}
                >
                  Academic Performance
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-around",
                  alignItems: "center",
                }}
              >
                {/* Homework Progress Ring */}
                <CircularProgress
                  percentage={stats.homeworkAvg}
                  label={stats.homeworkLabel}
                  size={90}
                  strokeWidth={9}
                  color="#D4AF37"
                />

                {/* Divider */}
                <View
                  style={{
                    width: 1,
                    height: 80,
                    backgroundColor: "#F3F4F6",
                  }}
                />

                {/* Exam Progress Ring */}
                <CircularProgress
                  percentage={stats.examAvg}
                  label={stats.examAvg === 0 ? "No results yet" : "Exam Avg"}
                  size={90}
                  strokeWidth={9}
                  color="#2563EB"
                />
              </View>

              {stats.homeworkAvg === 0 && stats.examAvg === 0 && (
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 11,
                    color: "#9CA3AF",
                    textAlign: "center",
                    marginTop: 14,
                  }}
                >
                  Scores will appear as assignments and exams are completed.
                </Text>
              )}
            </View>
          </View>

          {/* ── Quick Action Grid ─────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 13,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.8}
                  style={{
                    width: "47%",
                    backgroundColor: action.bg,
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "flex-start",
                    gap: 10,
                    borderColor: action.color + "20",
                    borderWidth: 1,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: action.color + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={action.icon} size={18} color={action.color} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 13,
                      color: "#111827",
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Recent Circulars ──────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 13,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Recent Circulars
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/circulars" as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 12,
                    color: "#D4AF37",
                  }}
                >
                  View All →
                </Text>
              </TouchableOpacity>
            </View>

            {circulars.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                  borderColor: "#F3F4F6",
                  borderWidth: 1,
                }}
              >
                <Ionicons name="megaphone-outline" size={32} color="#D1D5DB" />
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 13,
                    color: "#9CA3AF",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  No circulars yet
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  overflow: "hidden",
                  borderColor: "#F3F4F6",
                  borderWidth: 1,
                }}
              >
                {circulars.map((circular, index) => (
                  <TouchableOpacity
                    key={circular.id}
                    onPress={() => router.push("/circulars" as any)}
                    activeOpacity={0.7}
                    style={{
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 12,
                      borderBottomWidth: index < circulars.length - 1 ? 1 : 0,
                      borderBottomColor: "#F9FAFB",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        backgroundColor: "#FFF9EC",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Ionicons name="newspaper-outline" size={16} color="#D4AF37" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Inter-Medium",
                          fontSize: 13,
                          color: "#111827",
                          lineHeight: 18,
                        }}
                        numberOfLines={2}
                      >
                        {circular.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter-Regular",
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 3,
                        }}
                      >
                        {timeAgo(circular.created_at)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#D1D5DB" style={{ marginTop: 3 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Bottom Nav Bar */}
      <BottomNavBar />
    </View>
  );
}
