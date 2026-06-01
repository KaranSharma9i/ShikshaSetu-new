import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Header from "@/components/teacher/Header";

export default function MoreMenuScreen() {
  const router = useRouter();

  const menuItems = [
    {
      id: "timetable",
      title: "My Timetable",
      subtitle: "View your weekly class schedule",
      icon: "calendar" as const,
      route: "/(teacher)/more/timetable",
    },
    {
      id: "circulars",
      title: "Circulars",
      subtitle: "Institution announcements & notices",
      icon: "bell" as const,
      route: "/(teacher)/more/circulars",
    },
    {
      id: "exams",
      title: "Exam Schedule",
      subtitle: "Upcoming exams for your classes",
      icon: "clipboard" as const,
      route: "/(teacher)/more/exams",
    },
    {
      id: "marks",
      title: "Enter Marks",
      subtitle: "Record student exam marks by class",
      icon: "edit-3" as const,
      route: "/(teacher)/more/marks",
    },
  ];

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      <Header title="More" showBack={false} />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: "OpenSans-Bold",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: "#44474C",
            textTransform: "uppercase",
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          Quick Access
        </Text>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "rgba(0,0,0,0.04)",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 2,
          }}
          className="border border-gray-100"
        >
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.navigate(item.route as any)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: "#E4E2E1",
                }}
              >
                <View className="mr-4">
                  <Feather name={item.icon} size={24} color="#D4AF37" />
                </View>

                <View className="flex-1 pr-2">
                  <Text
                    style={{ fontFamily: "Poppins-SemiBold" }}
                    className="text-[15px] font-bold text-[#0D1B2A] leading-tight"
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ fontFamily: "Inter-Regular" }}
                    className="text-[12px] text-[#44474C] mt-0.5 leading-tight"
                  >
                    {item.subtitle}
                  </Text>
                </View>

                <Feather name="chevron-right" size={20} color="#0D1B2A" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
