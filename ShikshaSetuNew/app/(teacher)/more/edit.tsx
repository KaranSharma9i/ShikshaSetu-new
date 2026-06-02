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
import { useAuth } from "../../../src/hooks/useAuth";
import {
  getTeacherProfileByUserId,
  updateTeacherProfile,
} from "../../../src/repositories/teacherRepository";
import ProfilePhotoUploader from "../../../components/teacher/ProfilePhotoUploader";

export default function EditTeacherProfileScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return;
      try {
        const teacherProfile = await getTeacherProfileByUserId(userId);
        if (teacherProfile) {
          setProfile(teacherProfile);
          setEmail(teacherProfile.email || "");
          setPhone(teacherProfile.phone || "");
          setAddress(teacherProfile.address || "");
          setEmergencyContact(teacherProfile.emergency_contact || "");
        }
      } catch (err) {
        console.error("Failed to load teacher profile for editing:", err);
        Alert.alert("Error", "Failed to load profile information.");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [userId]);

  const isDirty = profile ? (
    email !== (profile.email || "") ||
    phone !== (profile.phone || "") ||
    address !== (profile.address || "") ||
    emergencyContact !== (profile.emergency_contact || "")
  ) : false;

  const handleSave = async () => {
    if (!profile || isSaving || !isDirty) return;
    setIsSaving(true);
    try {
      await updateTeacherProfile(profile.id, userId!, {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
      });
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error("Failed to update teacher profile:", err);
      Alert.alert("Error", err?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#F7F3EB] justify-center items-center">
        <ActivityIndicator size="large" color="#0D1B2A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F3EB]">
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
        showsVerticalScrollIndicator={false}
      >
        {/* Profile photo uploader */}
        <View className="mt-6 items-center">
          <ProfilePhotoUploader
            teacherId={profile.id}
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
          {/* Section: Contact & Account Information */}
          <Text className="font-poppins-semibold text-[14px] text-gray-400 tracking-wider uppercase mb-4">
            Contact & Account Information
          </Text>

          {/* Editable: Email Address */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="example@school.com"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              className={`bg-white border rounded-lg px-4 py-3 font-inter text-[15px] text-[#0D1B2A] ${
                focusedField === "email" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            />
          </View>

          {/* Editable: Phone Number (Contact) */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Phone Number (Contact)
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
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Address
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              placeholder="Your residential address"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedField("address")}
              onBlur={() => setFocusedField(null)}
              textAlignVertical="top"
              className={`bg-white border rounded-lg px-4 py-3 font-inter text-[15px] text-[#0D1B2A] h-20 ${
                focusedField === "address" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            />
          </View>

          {/* Editable: Emergency Contact */}
          <View className="mb-6">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Emergency Contact (Name/Phone)
            </Text>
            <TextInput
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="Contact name and phone number"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedField("emergencyContact")}
              onBlur={() => setFocusedField(null)}
              className={`bg-white border rounded-lg px-4 py-3 font-inter text-[15px] text-[#0D1B2A] ${
                focusedField === "emergencyContact" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            />
          </View>

          {/* Section: Academic & Personal Details (Read-Only) */}
          <Text className="font-poppins-semibold text-[14px] text-gray-400 tracking-wider uppercase mb-4">
            Academic & Permanent Details
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

          {/* Read-Only: Employee Code */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Employee Code
            </Text>
            <TextInput
              value={profile?.employee_code}
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>

          {/* Read-Only: Specialization */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Specialization
            </Text>
            <TextInput
              value={profile?.specialization || "General"}
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>

          {/* Read-Only: Qualification */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Qualification
            </Text>
            <TextInput
              value={profile?.qualification || "—"}
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>

          {/* Read-Only: Date of Birth */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Date of Birth
            </Text>
            <TextInput
              value={
                profile?.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"
              }
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>

          {/* Read-Only: Date of Joining */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Date of Joining
            </Text>
            <TextInput
              value={
                profile?.date_of_joining
                  ? new Date(profile.date_of_joining).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"
              }
              editable={false}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-inter text-[15px] text-gray-400"
            />
          </View>

          {/* Read-Only: Gender */}
          <View className="mb-2">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Gender
            </Text>
            <TextInput
              value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "—"}
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
    </View>
  );
}
