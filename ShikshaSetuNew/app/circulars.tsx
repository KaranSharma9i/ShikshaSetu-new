import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/useAuth";
import { useQuery } from "../src/hooks/useQuery";
import { getStudentProfileByUserId } from "../src/repositories/studentRepository";
import { getStudentCirculars } from "../src/repositories/circularRepository";
import { getStudentEvents } from "../src/repositories/eventRepository";
import Header from "../components/student/Header";
import BottomNavBar from "../components/student/BottomNavBar";

export default function CircularsScreen() {
  const { user, isLoaded, isSignedIn, theme } = useAuth();
  
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#ffe088";
  const creamColor = theme?.colors?.cream ?? "#F9F6EF";

  // 1. Fetch Student Profile
  const { data: studentProfile, isLoading: isProfileLoading } = useQuery(
    () => getStudentProfileByUserId(user?.id || ""),
    [user?.id]
  );

  const institutionId = studentProfile?.institution_id || "";
  const classId = studentProfile?.class_id || null;

  // 2. Fetch Circulars targeting students/class
  const { data: circularsData, isLoading: isCircularsLoading } = useQuery(
    () => institutionId ? getStudentCirculars(institutionId, classId) : Promise.resolve([]),
    [institutionId, classId]
  );

  // 3. Fetch Published Academic Events
  const { data: eventsData, isLoading: isEventsLoading } = useQuery(
    () => institutionId ? getStudentEvents(institutionId) : Promise.resolve([]),
    [institutionId]
  );

  const isLoading = isProfileLoading || isCircularsLoading || isEventsLoading;

  // Merge and sort both feeds by date descending
  const getFeedItems = () => {
    const circulars = (circularsData || []).map((c) => ({
      ...c,
      feedType: "circular" as const,
    }));
    const events = (eventsData || []).map((e) => ({
      ...e,
      feedType: "event" as const,
    }));

    return [...circulars, ...events].sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return timeB - timeA;
    });
  };

  const feedItems = getFeedItems();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: creamColor }}>
      {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}
      
      <Header
        studentName={studentProfile?.full_name}
        profilePhotoUrl={studentProfile?.profile_photo_url}
      />

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="font-poppins-bold text-2xl" style={{ color: primaryColor }}>
            Notice Board
          </Text>
          <Text className="font-inter text-xs text-gray-500 mt-1">
            Stay updated with school announcements and scheduled events.
          </Text>
        </View>

        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color={secondaryColor} />
            <Text className="font-inter text-xs text-gray-400 mt-3">Loading bulletin feed...</Text>
          </View>
        ) : feedItems.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 items-center justify-center mt-6">
            <Ionicons name="notifications-off-outline" size={40} color="#D1D5DB" />
            <Text className="font-poppins-semibold text-sm mt-3" style={{ color: primaryColor }}>
              All Clear!
            </Text>
            <Text className="font-inter text-xs text-gray-400 text-center mt-1">
              No new circulars or events scheduled at this time.
            </Text>
          </View>
        ) : (
          feedItems.map((item) => {
            if (item.feedType === "circular") {
              const isUrgent = item.category === "Urgent";
              return (
                <View
                  key={`circ-${item.id}`}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center space-x-1.5">
                      <View
                        className={`w-2 h-2 rounded-full ${
                          isUrgent ? "bg-rose-500" : "bg-blue-500"
                        }`}
                      />
                      <Text
                        className={`text-[9px] font-poppins-bold uppercase tracking-wider ${
                          isUrgent ? "text-rose-500" : "text-blue-500"
                        }`}
                      >
                        {item.category}
                      </Text>
                    </View>
                    <Text className="text-[9px] text-gray-400 font-inter">
                      {item.date}
                    </Text>
                  </View>

                  <Text className="font-poppins-bold text-sm mb-1.5 leading-tight" style={{ color: primaryColor }}>
                    {item.title}
                  </Text>
                  <Text className="text-xs text-neutral-charcoal leading-relaxed font-inter">
                    {item.body}
                  </Text>
                </View>
              );
            } else {
              // Parse date for calendar visual block
              const d = new Date(item.date);
              const isInvalidDate = isNaN(d.getTime());
              const monthLabel = isInvalidDate ? "EVENT" : d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
              const dayLabel = isInvalidDate ? "•" : d.toLocaleDateString("en-US", { day: "numeric" });

              return (
                <View
                  key={`event-${item.id}`}
                  className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden"
                  style={{ borderWidth: 1, borderColor: secondaryColor + "4d" }}
                >
                  {/* Visual gold category band */}
                  <View 
                    className="px-4 py-2 border-b flex-row justify-between items-center"
                    style={{ backgroundColor: secondaryColor + "0d", borderColor: secondaryColor + "26" }}
                  >
                    <View className="flex-row items-center space-x-1.5">
                      <Ionicons name="sparkles" size={12} color={secondaryColor} />
                      <Text 
                        className="text-[9px] font-poppins-bold uppercase tracking-wider"
                        style={{ color: theme?.colors?.secondary ?? '#A8871E' }}
                      >
                        {item.category} Event
                      </Text>
                    </View>
                    <View className="px-2 py-0.5 rounded" style={{ backgroundColor: secondaryColor }}>
                      <Text className="text-white text-[7px] font-poppins-bold uppercase tracking-wider">
                        Calendar
                      </Text>
                    </View>
                  </View>

                  <View className="p-4 flex-row space-x-4">
                    {/* Date Block */}
                    <View className="items-center justify-center bg-gray-50 border border-gray-100 rounded-xl w-[56px] h-[56px]">
                      <Text className="text-[9px] font-poppins-bold text-gray-400 uppercase">
                        {monthLabel}
                      </Text>
                      <Text className="text-lg font-poppins-bold -mt-1" style={{ color: primaryColor }}>
                        {dayLabel}
                      </Text>
                    </View>

                    {/* Content details */}
                    <View className="flex-1 justify-center">
                      <Text className="font-poppins-bold text-sm mb-1.5 leading-tight" style={{ color: primaryColor }}>
                        {item.title}
                      </Text>
                      
                      <View className="space-y-0.5">
                        <View className="flex-row items-center space-x-1.5">
                          <Ionicons name="time-outline" size={12} color="#75777D" />
                          <Text className="text-[10px] text-gray-500 font-inter">
                            {item.time || "All Day"}
                          </Text>
                        </View>
                        <View className="flex-row items-center space-x-1.5">
                          <Ionicons name="location-outline" size={12} color="#75777D" />
                          <Text className="text-[10px] text-gray-500 font-inter" numberOfLines={1}>
                            {item.location || "School Campus"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }
          })
        )}
      </ScrollView>

      <BottomNavBar />
    </SafeAreaView>
  );
}
