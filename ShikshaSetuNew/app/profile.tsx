import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Platform, 
  StatusBar 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../src/hooks/useAuth";
import { 
  getStudentProfileByUserId, 
  updateStudentProfile, 
  uploadProfilePhoto 
} from "../src/repositories/studentRepository";
import { supabase } from "../src/lib/supabase";
import Header from "../components/student/Header";
import BottomNavBar from "../components/student/BottomNavBar";

export default function ProfileScreen() {
  const router = useRouter();
  const { userId, signOut } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [institution, setInstitution] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = async () => {
    if (!userId) {
      setError("User session not found.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const studentProfile = await getStudentProfileByUserId(userId);
      if (!studentProfile) {
        setError("Student profile not found.");
        setIsLoading(false);
        return;
      }
      setProfile(studentProfile);

      // Fetch institution details if institution_id is available
      if (studentProfile.institution_id) {
        const { data: instData, error: instErr } = await supabase
          .from("institutions")
          .select("name, logo_url")
          .eq("id", studentProfile.institution_id)
          .maybeSingle();
        if (!instErr && instData) {
          setInstitution(instData);
        }
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const handleImagePick = async () => {
    if (isUploading) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to update profile photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      const fileUri = selectedAsset.uri;
      const mimeType = selectedAsset.mimeType || 'image/jpeg';

      setIsUploading(true);

      // 1. uploadProfilePhoto() -> returns publicUrl
      const publicUrl = await uploadProfilePhoto(userId!, fileUri, mimeType);
      
      // 2. updateStudentProfile() with { profile_photo_url: publicUrl }
      await updateStudentProfile(profile.id, userId!, { profile_photo_url: publicUrl });

      // 3. Update LOCAL state to show new photo immediately WITHOUT needing to refetch
      setProfile((prev: any) => prev ? { ...prev, profile_photo_url: publicUrl } : prev);
      
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (err: any) {
      console.error("Upload failed:", err);
      Alert.alert('Upload Error', err?.message || 'Failed to upload profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;
    return (
      <View className="flex-1 bg-[#fbf9f8]">
        {/* Header Placeholder */}
        <View 
          className="bg-white border-b border-[#E5E7EB] px-5 flex-row justify-between items-center z-50"
          style={{
            paddingTop: Platform.OS === "android" ? statusBarHeight + 15 : 15,
            paddingBottom: 15,
          }}
        >
          <View className="flex-row items-center space-x-2.5">
            <View className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-100" />
            <View className="space-y-1">
              <View className="w-16 h-3 bg-gray-200 rounded" />
              <View className="w-20 h-3 bg-gray-200 rounded" />
            </View>
          </View>
          <View className="flex-row items-center space-x-4">
            <View className="w-6 h-6 bg-gray-100 rounded-full" />
            <View className="w-8 h-8 bg-gray-200 rounded-full" />
          </View>
        </View>
        
        <ScrollView className="flex-1 px-4 py-4">
          {/* Profile Hero Card skeleton */}
          <View className="bg-white p-6 rounded-2xl shadow-sm items-center border border-gray-100/50 mb-4 h-56 justify-center">
            <View className="w-[100px] h-[100px] rounded-full bg-gray-200 mb-4" />
            <View className="w-40 h-6 bg-gray-200 rounded mb-2" />
            <View className="w-32 h-4 bg-gray-200 rounded" />
          </View>

          {/* Menu Items skeleton */}
          <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="flex-row items-center py-4 border-b border-gray-100 last:border-b-0">
                <View className="w-10 h-10 rounded-xl bg-gray-200 mr-3" />
                <View className="h-4 bg-gray-200 rounded flex-1" />
              </View>
            ))}
          </View>
        </ScrollView>
        {/* @ts-ignore */}
        <BottomNavBar activeTab="profile" />
      </View>
    );
  }

  if (error) {
    const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;
    return (
      <View className="flex-1 bg-[#fbf9f8]">
        <View 
          className="bg-white border-b border-[#E5E7EB] px-5 flex-row items-center z-50"
          style={{
            paddingTop: Platform.OS === "android" ? statusBarHeight + 15 : 45,
            paddingBottom: 15,
          }}
        >
          <Text className="font-poppins-bold text-lg text-[#0D1B2A]">Student Profile</Text>
        </View>
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#BA1A1A" />
          <Text className="font-poppins-semibold text-lg text-[#0D1B2A] mt-4 mb-2 text-center">
            Failed to Load Profile
          </Text>
          <Text className="font-inter text-gray-500 text-center mb-6 px-4">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchProfileData}
            className="bg-[#0D1B2A] px-6 py-3 rounded-xl shadow-sm"
            activeOpacity={0.8}
          >
            <Text className="font-poppins-medium text-white text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
        {/* @ts-ignore */}
        <BottomNavBar activeTab="profile" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fbf9f8]">
      <Header 
        studentName={profile?.full_name} 
        profilePhotoUrl={profile?.profile_photo_url}
        /* @ts-ignore */
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url ? { uri: institution.logo_url } : undefined}
      />
      
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Hero Card */}
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
          <View className="items-center mb-4 relative">
            <View className="relative">
              <View className="w-[100px] h-[100px] rounded-full border-[3px] border-[#D4AF37] overflow-hidden bg-gray-100 justify-center items-center">
                {profile?.profile_photo_url ? (
                  <Image 
                    source={{ uri: profile.profile_photo_url }} 
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Image 
                    source={require("../assets/profile.jpg")} 
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                )}
                
                {/* Upload Progress Indicator over photo */}
                {isUploading && (
                  <View className="absolute inset-0 bg-black/40 justify-center items-center rounded-full">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </View>

              {/* Edit Button bottom-right of photo, 28x28px */}
              <TouchableOpacity
                onPress={handleImagePick}
                disabled={isUploading}
                className={`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0D1B2A] items-center justify-center border-2 border-white shadow-sm ${
                  isUploading ? "opacity-50" : ""
                }`}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Student Name */}
          <Text className="font-poppins-bold text-[22px] text-[#0D1B2A] text-center">
            {profile?.full_name}
          </Text>

          {/* Badges Row */}
          <View className="flex-row justify-center items-center space-x-2 mt-3">
            {/* Grade Badge */}
            <View className="bg-[#0D1B2A] px-3.5 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="school" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text className="font-poppins-medium text-xs text-white">
                {profile?.class_name || "Grade N/A"}
              </Text>
            </View>

            {/* Roll No Badge */}
            <View className="bg-[#fed65b] px-3.5 py-1.5 rounded-full flex-row items-center">
              <Text className="font-poppins-medium text-xs text-[#745c00]">
                Roll No: {profile?.roll_number || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items Card */}
        <View 
          className="bg-white px-5 py-2 rounded-2xl mx-4 mt-4 border border-gray-100/50"
          style={{
            shadowColor: "rgba(13, 27, 42, 0.05)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          {/* Menu Item 1: Report Card */}
          <TouchableOpacity
            onPress={() => router.push("/report-card")}
            className="flex-row items-center py-4"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-[#0D1B2A] items-center justify-center mr-3">
              <Ionicons name="bar-chart-outline" size={20} color="#FFFFFF" />
            </View>
            <Text className="font-poppins-medium text-[15px] text-[#0D1B2A] flex-1">
              Report Card
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View className="h-[1px] bg-[#F3F4F6] w-full" />

          {/* Menu Item 2: Class Schedule */}
          <TouchableOpacity
            onPress={() => router.push("/timetable" as any)}
            className="flex-row items-center py-4"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-[#0D1B2A] items-center justify-center mr-3">
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            </View>
            <Text className="font-poppins-medium text-[15px] text-[#0D1B2A] flex-1">
              Class Schedule
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View className="h-[1px] bg-[#F3F4F6] w-full" />

          {/* Menu Item 3: Holidays */}
          <TouchableOpacity
            onPress={() => Alert.alert(
              'School Holidays',
              'Holiday calendar will be available soon.',
              [{ text: 'OK' }]
            )}
            className="flex-row items-center py-4"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-[#0D1B2A] items-center justify-center mr-3">
              <Ionicons name="umbrella-outline" size={20} color="#FFFFFF" />
            </View>
            <Text className="font-poppins-medium text-[15px] text-[#0D1B2A] flex-1">
              Holidays
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View className="h-[1px] bg-[#F3F4F6] w-full" />

          {/* Menu Item 4: Fee History & Receipts */}
          <TouchableOpacity
            onPress={() => router.push("/fees")}
            className="flex-row items-center py-4"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-[#0D1B2A] items-center justify-center mr-3">
              <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
            </View>
            <Text className="font-poppins-medium text-[15px] text-[#0D1B2A] flex-1">
              Fee History & Receipts
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Account Settings Card */}
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
          <Text className="font-poppins-semibold text-[16px] text-[#0D1B2A] mb-3">
            Account Settings
          </Text>

          {/* Update Personal Information */}
          <TouchableOpacity
            onPress={() => router.push("/profile/edit" as any)}
            className="flex-row items-center py-3.5"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-[#0D1B2A] items-center justify-center mr-3">
              <Ionicons name="person-outline" size={20} color="#FFFFFF" />
            </View>
            <Text className="font-poppins-medium text-[15px] text-[#0D1B2A] flex-1">
              Update Personal Information
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View className="h-[1px] bg-[#F3F4F6] w-full" />

          {/* Logout */}
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Logout', 
                  style: 'destructive',
                  onPress: () => signOut()
                }
              ]
            )}
            className="flex-row items-center py-3.5"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-[#ffdad6] items-center justify-center mr-3">
              <Ionicons name="log-out-outline" size={20} color="#BA1A1A" />
            </View>
            <Text className="font-poppins-medium text-[15px] text-[#BA1A1A] flex-1">
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* @ts-ignore */}
      <BottomNavBar activeTab="profile" />
    </View>
  );
}
