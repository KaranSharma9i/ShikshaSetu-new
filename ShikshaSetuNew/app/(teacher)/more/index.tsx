import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Header from "@/components/teacher/Header";
import { useAuth } from "@/src/hooks/useAuth";
import { getTeacherProfileByUserId } from "@/src/repositories/teacherRepository";
import ProfilePhotoUploader from "@/components/teacher/ProfilePhotoUploader";

export default function MoreMenuScreen() {
  const router = useRouter();
  const { userId, signOut, theme, user, session, isLoaded } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#ffe088";
  const creamColor = theme?.colors?.cream ?? "#F7F3EB";

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = async () => {
    if (!userId) {
      if (isLoaded) {
        console.error("fetchProfileData: userId is missing but auth is loaded.");
      }
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const teacherProfile = await getTeacherProfileByUserId(userId);
      if (!teacherProfile) {
        setError("Teacher profile not found.");
        setIsLoading(false);
        return;
      }
      setProfile(teacherProfile);
    } catch (err: any) {
      console.error("Error fetching teacher profile:", err);
      setError("Failed to load profile details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  useEffect(() => {
    if (isLoaded && !user && !session) {
      router.replace('/auth/signin');
    }
  }, [isLoaded, user, session]);

  if (!isLoaded || !user || !session) return null;

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

  if (isLoading) {
    return (
      <View style={{ backgroundColor: creamColor }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ backgroundColor: creamColor }} className="flex-1">
        <Header title="More" showBack={false} />
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#BA1A1A" />
          <Text style={{ color: primaryColor }} className="font-poppins-semibold text-lg mt-4 mb-2 text-center">
            Failed to Load Profile
          </Text>
          <Text className="font-inter text-gray-500 text-center mb-6 px-4">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchProfileData}
            style={{ backgroundColor: primaryColor }}
            className="px-6 py-3 rounded-xl shadow-sm"
            activeOpacity={0.8}
          >
            <Text className="font-poppins-medium text-white text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: creamColor }} className="flex-1">
      <Header title="More" showBack={false} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card (mimics student layout) */}
        <View 
          className="bg-white p-6 rounded-2xl mx-4 mt-4 items-center border border-gray-100/50"
          style={{
            shadowColor: "rgba(13, 27, 42, 0.05)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          {/* Centered Profile Photo */}
          <ProfilePhotoUploader
            teacherId={profile.id}
            userId={userId!}
            currentPhotoUrl={profile.profile_photo_url}
            onUploadSuccess={(newUrl) => {
              setProfile((prev: any) => prev ? { ...prev, profile_photo_url: newUrl } : prev);
            }}
          />

          {/* Teacher Name */}
          <Text style={{ color: primaryColor }} className="font-poppins-bold text-[22px] text-center">
            {profile?.full_name}
          </Text>

          {/* Badges Row */}
          <View className="flex-row justify-center items-center space-x-2 mt-3">
            {/* Specialization Badge */}
            <View style={{ backgroundColor: primaryColor }} className="px-3.5 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="star" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text className="font-poppins-medium text-xs text-white">
                {profile?.specialization || "General"}
              </Text>
            </View>

            {/* Employee Code Badge */}
            <View style={{ backgroundColor: secondaryLightColor + "20", borderColor: secondaryLightColor + "40", borderWidth: 1 }} className="px-3.5 py-1.5 rounded-full flex-row items-center">
              <Text style={{ color: secondaryColor }} className="font-poppins-medium text-xs">
                Code: {profile?.employee_code || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Details Card (displays all details from database) */}
        <View 
          className="bg-white p-5 rounded-2xl mx-4 mt-4 border border-gray-100/50"
          style={{
            shadowColor: "rgba(13, 27, 42, 0.05)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text style={{ color: primaryColor }} className="font-poppins-semibold text-[16px]">
              Personal Details
            </Text>
            <Ionicons name="person-outline" size={18} color={secondaryColor} />
          </View>

          <View className="space-y-3">
            {/* Email */}
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="font-inter text-xs text-gray-400">Email Address</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs">{profile?.email || "—"}</Text>
            </View>

            {/* Contact */}
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="font-inter text-xs text-gray-400">Phone (Contact)</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs">{profile?.phone || "—"}</Text>
            </View>

            {/* Qualification */}
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="font-inter text-xs text-gray-400">Qualification</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs">{profile?.qualification || "—"}</Text>
            </View>

            {/* Date of Birth */}
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="font-inter text-xs text-gray-400">Date of Birth</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs">
                {profile?.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </Text>
            </View>

            {/* Gender */}
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="font-inter text-xs text-gray-400">Gender</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs capitalize">{profile?.gender || "—"}</Text>
            </View>

            {/* Date of Joining */}
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="font-inter text-xs text-gray-400">Date of Joining</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs">
                {profile?.date_of_joining
                  ? new Date(profile.date_of_joining).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </Text>
            </View>

            {/* Address */}
            <View className="py-1 border-b border-gray-50">
              <Text className="font-inter text-xs text-gray-400 mb-1">Residential Address</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs leading-relaxed">
                {profile?.address || "—"}
              </Text>
            </View>

            {/* Emergency Contact */}
            <View className="py-1">
              <Text className="font-inter text-xs text-gray-400 mb-1">Emergency Contact</Text>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-xs leading-relaxed">
                {profile?.emergency_contact || "—"}
              </Text>
            </View>
          </View>

          {/* Update Personal Information Button */}
          <TouchableOpacity
            onPress={() => router.push("/(teacher)/more/edit" as any)}
            className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View style={{ backgroundColor: primaryColor }} className="w-8 h-8 rounded-lg items-center justify-center mr-2">
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              </View>
              <Text style={{ color: primaryColor }} className="font-poppins-medium text-[14px]">
                Update Personal Information
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Quick Access Card */}
        <View className="px-4 mt-6">
          <Text
            style={{
              fontFamily: "OpenSans-Bold",
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.8,
              color: "#44474C",
              textTransform: "uppercase",
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
                    <Feather name={item.icon} size={24} color={secondaryColor} />
                  </View>

                  <View className="flex-1 pr-2">
                    <Text
                      style={{ fontFamily: "Poppins-SemiBold", color: primaryColor }}
                      className="text-[15px] font-bold leading-tight"
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

                  <Feather name="chevron-right" size={20} color={primaryColor} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Signout Card */}
        <View 
          className="bg-white p-5 rounded-2xl mx-4 mt-6 border border-gray-100/50"
          style={{
            shadowColor: "rgba(13, 27, 42, 0.05)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          {/* Update Password */}
          <TouchableOpacity
            onPress={() => router.push("/(teacher)/more/update-password" as any)}
            className="flex-row items-center pb-3.5"
            activeOpacity={0.7}
          >
            <View style={{ backgroundColor: primaryColor }} className="w-10 h-10 rounded-xl items-center justify-center mr-3">
              <Ionicons name="key-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={{ color: primaryColor }} className="font-poppins-medium text-[15px] flex-1">
              Update Password
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View className="h-[1px] bg-[#F3F4F6] w-full mb-3.5" />

          <TouchableOpacity
            onPress={() => Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out from this portal?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Sign Out', 
                  style: 'destructive',
                  onPress: () => signOut()
                }
              ]
            )}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-[#ffdad6] items-center justify-center mr-3">
              <Ionicons name="log-out-outline" size={20} color="#BA1A1A" />
            </View>
            <Text className="font-poppins-medium text-[15px] text-[#BA1A1A] flex-1">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
