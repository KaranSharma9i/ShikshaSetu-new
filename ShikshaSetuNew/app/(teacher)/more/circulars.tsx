import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";
import dayjs from "dayjs";

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

function CircularsSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4 space-y-4">
      <SkeletonBox height={120} borderRadius={16} />
      <SkeletonBox height={120} borderRadius={16} />
      <SkeletonBox height={120} borderRadius={16} />
    </View>
  );
}

interface CircularItem {
  id: string;
  title: string;
  content: string;
  publish_date: string;
  category?: string; // Optional field
}

export default function CircularsScreen() {
  const router = useRouter();
  const { userId, isLoaded, isSignedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      loadCirculars();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadCirculars = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch teacher record to get institution_id
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, institution_id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error loading teacher:", teacherErr);
        setError("Could not load teacher profile");
        setLoading(false);
        return;
      }

      // 2. Fetch circulars for teacher's institution_id targeted at teachers
      const { data: rawCirculars, error: circularsErr } = await supabase
        .from("circulars")
        .select("*")
        .eq("institution_id", teacherData.institution_id)
        .contains("target_roles", ["teacher"])
        .order("created_at", { ascending: false });

      if (circularsErr) {
        console.error("Error loading circulars:", circularsErr);
        setError("Failed to fetch circulars");
        setLoading(false);
        return;
      }

      setCirculars(rawCirculars || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load circulars:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      <Header title="Circulars" showBack={true} onBack={() => router.back()} />

      {loading ? (
        <CircularsSkeleton />
      ) : error ? (
        <View className="mx-4 mt-6 bg-red-50 p-4 rounded-xl border border-red-200 flex-row items-center justify-between">
          <Text className="font-inter text-red-700 text-sm flex-1 mr-2">{error}</Text>
          <TouchableOpacity
            onPress={() => loadCirculars()}
            className="bg-white border border-red-300 px-3 py-1.5 rounded-lg"
          >
            <Text className="font-inter-medium text-red-700 text-xs">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {circulars.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Feather name="bell" size={48} color="#D4AF37" />
              <Text
                style={{ fontFamily: "Poppins-SemiBold" }}
                className="text-sm font-bold text-[#0D1B2A] mt-4"
              >
                No circulars yet
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {circulars.map((item) => {
                const isExpanded = expandedIds[item.id] || false;
                const canExpand = item.content.length > 100;
                const previewText = canExpand ? item.content.slice(0, 100) + "..." : item.content;
                const formattedDate = dayjs(item.publish_date).format("DD MMM YYYY");

                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 16,
                      shadowColor: "rgba(0,0,0,0.04)",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                    className="border border-gray-100"
                  >
                    {/* Top Row: Category Pill & Date */}
                    <View className="flex-row items-center justify-between">
                      {item.category ? (
                        <View
                          style={{
                            backgroundColor: "#D4AF37",
                            borderRadius: 9999,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{ fontFamily: "OpenSans-Bold" }}
                            className="text-[11px] font-bold text-[#0D1B2A]"
                          >
                            {item.category}
                          </Text>
                        </View>
                      ) : (
                        <View />
                      )}
                      <Text
                        style={{ fontFamily: "Inter-Regular" }}
                        className="text-[12px] text-gray-400 text-right"
                      >
                        {formattedDate}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text
                      style={{ fontFamily: "Poppins-SemiBold" }}
                      className="text-[15px] font-bold text-[#0D1B2A] mt-2 leading-tight"
                    >
                      {item.title}
                    </Text>

                    {/* Content / Preview */}
                    <Text
                      style={{ fontFamily: "Inter-Regular" }}
                      className="text-[13px] text-[#44474C] mt-2 leading-relaxed"
                    >
                      {isExpanded ? item.content : previewText}
                    </Text>

                    {/* Toggle Button */}
                    {canExpand && (
                      <TouchableOpacity
                        onPress={() => toggleExpand(item.id)}
                        activeOpacity={0.7}
                        className="mt-3 align-self-start"
                      >
                        <Text
                          style={{ fontFamily: "Inter-SemiBold", color: "#D4AF37" }}
                          className="text-[13px] font-bold"
                        >
                          {isExpanded ? "Read Less" : "Read More"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
