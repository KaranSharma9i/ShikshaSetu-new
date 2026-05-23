import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { schoolData } from "../../constants/schoolData";

export default function InstitutionDashboard() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          <View className="flex-row flex-wrap -mx-2">
            {schoolData.metrics.map((metric) => (
              <View key={metric.id} className="w-1/2 px-2 mb-4">
                <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
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
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions (Bento Style) */}
        <View className="px-5 mb-6">
          <Text className="text-[#0F1C2C] font-poppins-bold text-base mb-3 px-1">
            Quick Actions
          </Text>
          <View className="grid grid-cols-2 gap-3 flex-row flex-wrap">
            {/* Add Student */}
            <TouchableOpacity
              onPress={() => router.push("/institution/register?type=student" as any)}
              className="w-[48%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm mb-3 mr-[4%]"
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
              className="w-[48%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm mb-3"
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
              className="w-[48%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm mr-[4%]"
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
              className="w-[48%] bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm"
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

            <View className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-white/5">
              {schoolData.circulars.map((circular) => (
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
          </View>
        </View>
      </ScrollView>

      {/* Custom Bottom Navbar */}
      <BottomNavBar activeTab="home" />
    </SafeAreaView>
  );
}
