import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/useAuth";
import { supabase } from "../../src/lib/supabase";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";

export default function InstitutionUpdatePasswordScreen() {
  const router = useRouter();
  useAuth();

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
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <Header title="Update Password" />

      <ScrollView 
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Card */}
        <View className="px-5 pt-6">
          <View className="bg-white rounded-3xl p-5 border border-gray-200/60 shadow-sm">
            <Text className="text-[#0F1C2C] font-poppins-bold text-sm mb-4">
              Security settings
            </Text>

            {/* Current Password */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Current Password
            </Text>
            <View 
              className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-4 flex-row items-center ${
                focusedField === "current" ? "border-[#0F1C2C]" : "border-gray-200"
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
                className="flex-1 font-inter text-xs text-[#0F1C2C] p-0"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="p-1">
                <Feather name={showCurrent ? "eye" : "eye-off"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              New Password (min 6 characters)
            </Text>
            <View 
              className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-4 flex-row items-center ${
                focusedField === "new" ? "border-[#0F1C2C]" : "border-gray-200"
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
                className="flex-1 font-inter text-xs text-[#0F1C2C] p-0"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-1">
                <Feather name={showNew ? "eye" : "eye-off"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Confirm New Password */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Confirm New Password
            </Text>
            <View 
              className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-4 flex-row items-center ${
                focusedField === "confirm" ? "border-[#0F1C2C]" : "border-gray-200"
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
                className="flex-1 font-inter text-xs text-[#0F1C2C] p-0"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                <Feather name={showConfirm ? "eye" : "eye-off"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {error ? (
              <Text className="text-red-500 font-inter text-xs mt-2 ml-1">
                {error}
              </Text>
            ) : null}

            {/* Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className={`py-4 rounded-xl items-center flex-row justify-center space-x-2 mt-6 ${
                currentPassword && newPassword && confirmPassword && !isSaving ? "bg-[#0F1C2C]" : "bg-gray-300"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
              ) : null}
              <Text className="text-[#ffe088] font-poppins-bold text-xs">
                Update Password
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="utilities" />
    </SafeAreaView>
  );
}
