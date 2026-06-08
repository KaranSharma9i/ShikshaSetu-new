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
  const { theme } = useAuth();

  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#F2C14E";
  const creamColor = theme?.colors?.cream ?? "#F5F0E8";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";

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

      // 3. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: creamColor }}>
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
            <Text className="font-poppins-bold text-sm mb-4" style={{ color: primaryColor }}>
              Security settings
            </Text>

            {/* Current Password */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Current Password
            </Text>
            <View 
              className="bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-4 flex-row items-center"
              style={{ borderColor: focusedField === "current" ? primaryColor : "#E5E7EB" }}
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
                className="flex-1 font-inter text-xs p-0"
                style={{ color: primaryColor }}
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
              className="bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-4 flex-row items-center"
              style={{ borderColor: focusedField === "new" ? primaryColor : "#E5E7EB" }}
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
                className="flex-1 font-inter text-xs p-0"
                style={{ color: primaryColor }}
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
              className="bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-4 flex-row items-center"
              style={{ borderColor: focusedField === "confirm" ? primaryColor : "#E5E7EB" }}
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
                className="flex-1 font-inter text-xs p-0"
                style={{ color: primaryColor }}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                <Feather name={showConfirm ? "eye" : "eye-off"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {error ? (
              <Text className="font-inter text-xs mt-2 ml-1" style={{ color: dangerColor }}>
                {error}
              </Text>
            ) : null}

            {/* Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="py-4 rounded-xl items-center flex-row justify-center space-x-2 mt-6"
              style={{
                backgroundColor: currentPassword && newPassword && confirmPassword && !isSaving ? primaryColor : "#E5E7EB"
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={secondaryColor} className="mr-2" />
              ) : null}
              <Text className="font-poppins-bold text-xs" style={{ color: currentPassword && newPassword && confirmPassword && !isSaving ? secondaryColor : "#75777D" }}>
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
