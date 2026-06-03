import React, { useState } from "react";
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
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/useAuth";
import { supabase } from "../../src/lib/supabase";
import BottomNavBar from "../../components/student/BottomNavBar";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  useAuth();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Field visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async () => {
    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }
    if (!newPassword) {
      setError("Please enter your new password");
      return;
    }
    if (newPassword.length < 6) {
      setError("Passwords must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      // 1. Get current user's email directly from Supabase to prevent stale context/hook values
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;

      if (!userEmail) {
        setError("User email not found. Please log in again.");
        setIsSaving(false);
        return;
      }

      // 2. Verify current password by signing in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInErr) {
        setError("Current password is incorrect");
        setIsSaving(false);
        return;
      }

      // 2. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setError(updateErr.message);
        setIsSaving(false);
        return;
      }

      Alert.alert("Success", "Password updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error("Failed to update password:", err);
      setError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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
            Update Password
          </Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Card */}
        <View 
          className="bg-white px-5 py-6 rounded-2xl mx-4 mt-6 border border-gray-100/50"
          style={{
            shadowColor: "rgba(13, 27, 42, 0.05)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          <Text className="font-poppins-semibold text-[14px] text-gray-400 tracking-wider uppercase mb-5">
            Security Settings
          </Text>

          {/* Current Password */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Current Password
            </Text>
            <View 
              className={`bg-white border rounded-lg px-4 py-3 flex-row items-center ${
                focusedField === "current" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            >
              <TextInput
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setError("");
                }}
                secureTextEntry={!showCurrent}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("current")}
                onBlur={() => setFocusedField(null)}
                className="flex-1 font-inter text-[15px] text-[#0D1B2A] p-0"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="p-1">
                <Feather name={showCurrent ? "eye" : "eye-off"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              New Password (min 6 characters)
            </Text>
            <View 
              className={`bg-white border rounded-lg px-4 py-3 flex-row items-center ${
                focusedField === "new" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            >
              <TextInput
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setError("");
                }}
                secureTextEntry={!showNew}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("new")}
                onBlur={() => setFocusedField(null)}
                className="flex-1 font-inter text-[15px] text-[#0D1B2A] p-0"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-1">
                <Feather name={showNew ? "eye" : "eye-off"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password */}
          <View className="mb-4">
            <Text className="font-inter text-[12px] text-gray-400 uppercase mb-1.5 tracking-wider">
              Confirm New Password
            </Text>
            <View 
              className={`bg-white border rounded-lg px-4 py-3 flex-row items-center ${
                focusedField === "confirm" ? "border-[#0D1B2A]" : "border-gray-200"
              }`}
            >
              <TextInput
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError("");
                }}
                secureTextEntry={!showConfirm}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
                className="flex-1 font-inter text-[15px] text-[#0D1B2A] p-0"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                <Feather name={showConfirm ? "eye" : "eye-off"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <Text className="text-red-500 font-inter text-xs mt-2 ml-1">
              {error}
            </Text>
          ) : null}
        </View>

        {/* Update Password Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className={`mx-4 mt-6 py-4 rounded-xl items-center justify-center flex-row ${
            currentPassword && newPassword && confirmPassword && !isSaving ? "bg-[#0D1B2A]" : "bg-gray-300"
          }`}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
          ) : null}
          <Text className="font-poppins-semibold text-white text-base">
            Update Password
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* @ts-ignore */}
      <BottomNavBar activeTab="profile" />
    </View>
  );
}
