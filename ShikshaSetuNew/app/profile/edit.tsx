import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/useAuth";
import {
  getStudentProfileByUserId,
  updateStudentProfile,
} from "../../src/repositories/studentRepository";
import BottomNavBar from "../../components/student/BottomNavBar";
import ProfilePhotoUploader from "../../components/student/ProfilePhotoUploader";

export default function EditProfileScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return;
      try {
        const studentProfile = await getStudentProfileByUserId(userId);
        if (studentProfile) {
          setProfile(studentProfile);
          setPhone(studentProfile.phone || "");
          setAddress(studentProfile.address || "");
          setGuardianName(studentProfile.guardian_name || "");
          setGuardianPhone(studentProfile.guardian_phone || "");
        }
      } catch (err) {
        console.error("Failed to load profile for editing:", err);
        Alert.alert("Error", "Failed to load profile information.");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [userId]);

  const isDirty = profile ? (
    phone !== (profile.phone || "") ||
    address !== (profile.address || "") ||
    guardianName !== (profile.guardian_name || "") ||
    guardianPhone !== (profile.guardian_phone || "")
  ) : false;

  const handleSave = async () => {
    if (!profile || isSaving || !isDirty) return;
    setIsSaving(true);
    try {
      await updateStudentProfile(profile.id, userId!, {
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        guardian_name: guardianName.trim() || undefined,
        guardian_phone: guardianPhone.trim() || undefined,
      });
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", err?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#fbf9f8] justify-center items-center">
        <ActivityIndicator size="large" color="#0D1B2A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fbf9f8]">
      {/* Custom Header */}
      <View 
        className="bg-white border-b border-[#E5E7EB] px-5 flex-row items-center justify-between z-50"
        style={{
          paddingTop: Platform.OS === "android" ? statusBarHeight + 15 : 45,
          paddingBottom: 15,
        }}
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mr-3 p-1"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
          </TouchableOpacity>
          <Text className="font-poppins-semibold text-lg text-[#0D1B2A]">
            Edit Profile
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || isSaving}
          className="p-1"
          activeOpacity={0.7}
        >
          <Text 
            style={{ color: isDirty && !isSaving ? "#D4AF37" : "#E5E7EB" }}
            className="font-poppins-semibold text-base"
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile photo uploader */}
        <View className="mt-6 items-center">
          <ProfilePhotoUploader
            studentId={profile.id}
            userId={userId!}
            currentPhotoUrl={profile.profile_photo_url}
            onUploadSuccess={(newUrl) => {
              setProfile((prev: any) => prev ? { ...prev, profile_photo_url: newUrl } : prev);
            }}
          />
        </View>

        {/* Form Card */}
        <View 
          className="bg-white px-5 py-6 rounded-2xl mx-4 mt-2 border border-gray-100/50"
          style={{
            shadowColor: "rgba(13, 27, 42, 0.05)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          {/* Section: Personal Information */}
          <Text className="font-poppins-semibold text-[14px] text-gray-400 tracking-wider uppercase mb-4">
            Personal Information
          </Text>

          {/* Read-Only: Full Name */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Full Name
            </Text>
            <TextInput
              value={profile?.full_name}
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>

          {/* Editable: Phone Number */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Phone Number
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedField("phone")}
              onBlur={() => setFocusedField(null)}
              className={`bg-white border rounded-lg px-4 py-3 font-inter text-[15px] text-[#0D1B2A] ${
                focusedField === "phone" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            />
          </View>

          {/* Editable: Address */}
          <View className="mb-6">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Address
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              placeholder="Your address"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedField("address")}
              onBlur={() => setFocusedField(null)}
              textAlignVertical="top"
              className={`bg-white border rounded-lg px-4 py-3 font-inter text-[15px] text-[#0D1B2A] h-20 ${
                focusedField === "address" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            />
          </View>

          {/* Section: Guardian Information */}
          <Text className="font-poppins-semibold text-[14px] text-gray-400 tracking-wider uppercase mb-4">
            Guardian Information
          </Text>

          {/* Editable: Guardian Name */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Guardian Name
            </Text>
            <TextInput
              value={guardianName}
              onChangeText={setGuardianName}
              placeholder="Guardian's full name"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedField("guardianName")}
              onBlur={() => setFocusedField(null)}
              className={`bg-white border rounded-lg px-4 py-3 font-inter text-[15px] text-[#0D1B2A] ${
                focusedField === "guardianName" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            />
          </View>

          {/* Editable: Guardian Phone */}
          <View className="mb-6">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Guardian Phone
            </Text>
            <TextInput
              value={guardianPhone}
              onChangeText={setGuardianPhone}
              keyboardType="phone-pad"
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedField("focusedField")}
              onBlur={() => setFocusedField(null)}
              className={`bg-white border rounded-lg px-4 py-3 font-inter text-[15px] text-[#0D1B2A] ${
                focusedField === "guardianPhone" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            />
          </View>

          {/* Section: Academic Information (Read-Only) */}
          <Text className="font-poppins-semibold text-[14px] text-gray-400 tracking-wider uppercase mb-4">
            Academic Details
          </Text>

          {/* Read-Only: Class & Section */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Class & Section
            </Text>
            <TextInput
              value={profile ? `${profile.class_name} - ${profile.section_name}` : ""}
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>

          {/* Read-Only: Roll Number */}
          <View className="mb-2">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Roll Number
            </Text>
            <TextInput
              value={profile?.roll_number ? String(profile.roll_number) : "N/A"}
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>
        </View>

        {/* Save Button inside ScrollView */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || isSaving}
          className={`mx-4 mt-6 py-4 rounded-xl items-center justify-center flex-row ${
            isDirty && !isSaving ? "bg-[#0D1B2A]" : "bg-gray-300"
          }`}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
          ) : null}
          <Text className="font-poppins-semibold text-white text-base">
            Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* @ts-ignore */}
      <BottomNavBar activeTab="profile" />
    </View>
  );
}
