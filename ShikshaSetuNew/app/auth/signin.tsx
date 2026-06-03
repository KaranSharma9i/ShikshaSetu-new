import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { supabase } from "@/src/lib/supabase";

export default function SigninScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { signIn, isLoaded } = useAuth();

  // Form State
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password / OTP Reset States
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

  const handleSendOTP = async () => {
    if (!resetEmail.trim()) {
      setResetError("Please enter your email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setResetError("Please enter a valid email address");
      return;
    }

    setResetLoading(true);
    setResetError("");
    setResetSuccess("");

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: resetEmail.trim(),
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpErr) {
        throw otpErr;
      }

      setResetSuccess("OTP sent successfully to your email!");
      setForgotStep(2);
    } catch (err: any) {
      console.warn("OTP request failed:", err?.message || err);
      setResetError(err?.message || "Failed to send OTP. Please verify email is correct.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOTPAndReset = async () => {
    if (!otpToken.trim() || otpToken.trim().length !== 6) {
      setResetError("Please enter a valid 6-digit OTP code");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setResetError("New password must be at least 6 characters");
      return;
    }

    setResetLoading(true);
    setResetError("");
    setResetSuccess("");

    try {
      // 1. Verify OTP
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: resetEmail.trim(),
        token: otpToken.trim(),
        type: 'email'
      });

      if (verifyErr) {
        throw verifyErr;
      }

      // 2. Immediately update password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        throw updateErr;
      }

      setResetSuccess("Password reset successfully! You can now log in.");
      // Auto close and prefill sign in form with email & new password for convenience
      setTimeout(() => {
        setForgotPasswordVisible(false);
        setEmailAddress(resetEmail);
        setPassword(newPassword);
      }, 2000);
    } catch (err: any) {
      console.warn("Verification failed:", err?.message || err);
      setResetError(err?.message || "OTP verification failed. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDF9F1] justify-center items-center">
        <ActivityIndicator size="large" color="#FF5E00" />
      </SafeAreaView>
    );
  }

  const validateInput = () => {
    if (!emailAddress.trim()) {
      setError("Please enter your email address");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress.trim())) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password) {
      setError("Please enter your password");
      return false;
    }
    setError("");
    return true;
  };

  const handleSignInSubmit = async () => {
    if (!validateInput()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await signIn(emailAddress, password);
      router.replace("/");
    } catch (err: any) {
      console.warn("Sign-in failed:", err?.message || err);
      const errMsg =
        err?.message ||
        "Invalid email or password.";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get Role emoji and styling
  const getRoleBadgeInfo = () => {
    switch (role?.toLowerCase()) {
      case "student":
        return { label: "Student Account 🎓", color: "bg-[#FFF4E5] text-[#FF8300] border-[#FFE0CC]" };
      case "teacher":
        return { label: "Teacher Account 👩‍🏫", color: "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]" };
      case "school":
      case "institution_admin":
        return { label: "School Portal 🏫", color: "bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]" };
      default:
        return { label: "Personal Account ✨", color: "bg-[#FFF4E5] text-[#FF8300] border-[#FFE0CC]" };
    }
  };

  const badgeInfo = getRoleBadgeInfo();

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Back Button */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/80 items-center justify-center border border-gray-100 shadow-sm"
            >
              <Ionicons name="arrow-back" size={20} color="#1F2937" />
            </TouchableOpacity>
            
            {/* Dynamic Role Badge */}
            <View className={`px-4 py-1.5 rounded-full border ${badgeInfo.color}`}>
              <Text className="font-poppins-bold text-xs">{badgeInfo.label}</Text>
            </View>
            <View className="w-10" />
          </View>

          {/* Logo & App Branding */}
          <View className="items-center justify-center mt-2 mb-2">
            <View className="w-24 h-24 bg-white rounded-2xl items-center justify-center shadow-sm border border-orange-100/30 mb-2">
              <Image
                source={require("../../assets/icon.png")}
                style={{ width: 72, height: 72 }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-poppins-bold text-margam-orange">
              Mar<Text className="text-margam-yellow">gam</Text>
            </Text>
          </View>
          <Text className="text-center font-poppins text-[10px] uppercase tracking-widest text-margam-orange font-bold mb-4">
            Learn • Connect • Grow
          </Text>

          {/* Title */}
          <View className="items-center px-6">
            <Text className="text-3xl font-poppins-bold text-neutral-charcoal text-center mb-1">
              Welcome back!
            </Text>
            <Text className="text-sm font-inter text-neutral-steel text-center mb-3">
              Sign in to continue your journey 🚀
            </Text>
          </View>

          {/* Mascot Section */}
          <View className="items-center justify-center mt-2 relative">
            <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFF4E5', position: 'absolute', opacity: 0.7 }} />
            <Image
              source={require("../../assets/mascot.png")}
              style={{ width: 190, height: 190, maxWidth: '80%' }}
              resizeMode="contain"
            />
          </View>

          {/* Main Card */}
          <View className="bg-white rounded-3xl mx-4 my-4 p-6 shadow-md border border-orange-100/50">
            {/* Input Label & Field - Email */}
            <Text className="font-poppins-bold text-neutral-charcoal text-sm mb-2">
              Email Address
            </Text>

            <View
              className={`flex-row items-center bg-[#FCFAFA] border px-4 py-3.5 rounded-2xl mb-4 ${
                error && !emailAddress.trim() ? "border-red-500" : "border-gray-200/80"
              }`}
            >
              <Feather
                name="mail"
                size={18}
                color="#9CA3AF"
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={emailAddress}
                onChangeText={(text) => {
                  setEmailAddress(text);
                  setError("");
                }}
                placeholder="Enter your email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-inter text-neutral-charcoal text-[15px]"
              />
            </View>

            {/* Input Label & Field - Password */}
            <Text className="font-poppins-bold text-neutral-charcoal text-sm mb-2">
              Password
            </Text>

            <View
              className={`flex-row items-center bg-[#FCFAFA] border px-4 py-3.5 rounded-2xl mb-1 ${
                error && !password ? "border-red-500" : "border-gray-200/80"
              }`}
            >
              <Feather
                name="lock"
                size={18}
                color="#9CA3AF"
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-inter text-neutral-charcoal text-[15px]"
              />
            </View>

            {/* Forgot Password Link */}
            <View className="flex-row justify-end mt-1.5 mb-2.5 px-1">
              <TouchableOpacity
                onPress={() => {
                  setResetEmail(emailAddress);
                  setForgotStep(1);
                  setResetError("");
                  setResetSuccess("");
                  setOtpToken("");
                  setNewPassword("");
                  setForgotPasswordVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text className="font-poppins-semibold text-xs text-[#FF5E00]">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <Text className="text-red-500 font-inter text-xs mt-2 mb-2 ml-1">
                {error}
              </Text>
            ) : (
              <View className="h-4" />
            )}

            {/* Action CTA Button */}
            <TouchableOpacity
              onPress={handleSignInSubmit}
              disabled={isSubmitting}
              activeOpacity={0.9}
              className="overflow-hidden rounded-2xl shadow-md mt-2"
            >
              <View className="bg-[#FF5E00] py-4 items-center flex-row justify-center">
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Text className="text-white font-poppins-bold text-base mr-2">
                      Sign In
                    </Text>
                    <Feather name="arrow-right" size={16} color="white" />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Bottom redirection */}
          <View className="flex-row justify-center items-center mt-2 mb-8">
            <Text className="font-inter text-neutral-steel text-sm">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push(`/auth/signup?role=${role || ""}` as any)}>
              <Text className="font-poppins-bold text-[#FF5E00] text-sm">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password OTP Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={forgotPasswordVisible}
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-3xl w-full max-w-sm p-6 border border-orange-100/50 shadow-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-poppins-bold text-neutral-charcoal">
                Reset Password
              </Text>
              <TouchableOpacity onPress={() => setForgotPasswordVisible(false)} className="p-1">
                <Feather name="x" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {forgotStep === 1 ? (
              <View>
                <Text className="font-inter text-neutral-steel text-sm mb-4 leading-relaxed">
                  Enter your registered email address to receive a one-time reset code (OTP).
                </Text>

                <View
                  className={`flex-row items-center bg-[#FCFAFA] border px-4 py-3.5 rounded-2xl mb-4 ${
                    resetError ? "border-red-500" : "border-gray-200/80"
                  }`}
                >
                  <Feather name="mail" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                  <TextInput
                    value={resetEmail}
                    onChangeText={(text) => {
                      setResetEmail(text);
                      setResetError("");
                      setResetSuccess("");
                    }}
                    placeholder="Enter email address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 font-inter text-neutral-charcoal text-sm"
                  />
                </View>

                {resetError ? (
                  <Text className="text-red-500 font-inter text-xs mb-4 ml-1">
                    {resetError}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={handleSendOTP}
                  disabled={resetLoading}
                  activeOpacity={0.9}
                  className="overflow-hidden rounded-2xl shadow-sm"
                >
                  <View className="bg-[#FF5E00] py-3.5 items-center flex-row justify-center">
                    {resetLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white font-poppins-bold text-sm">
                        Send OTP Code
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text className="font-inter text-neutral-steel text-sm mb-4 leading-relaxed">
                  We've sent a 6-digit OTP code to <Text className="font-semibold">{resetEmail}</Text>. Enter the code and your new password below.
                </Text>

                {/* OTP Input */}
                <Text className="font-poppins-bold text-neutral-charcoal text-xs mb-2 ml-1">
                  6-Digit OTP Code
                </Text>
                <View
                  className={`flex-row items-center bg-[#FCFAFA] border px-4 py-3 rounded-2xl mb-4 ${
                    resetError && !otpToken ? "border-red-500" : "border-gray-200/80"
                  }`}
                >
                  <Feather name="key" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                  <TextInput
                    value={otpToken}
                    onChangeText={(text) => {
                      setOtpToken(text);
                      setResetError("");
                      setResetSuccess("");
                    }}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    className="flex-1 font-inter text-neutral-charcoal text-sm"
                  />
                </View>

                {/* New Password Input */}
                <Text className="font-poppins-bold text-neutral-charcoal text-xs mb-2 ml-1">
                  New Password (min 6 chars)
                </Text>
                <View
                  className={`flex-row items-center bg-[#FCFAFA] border px-4 py-3 rounded-2xl mb-4 ${
                    resetError && !newPassword ? "border-red-500" : "border-gray-200/80"
                  }`}
                >
                  <Feather name="lock" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                  <TextInput
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setResetError("");
                      setResetSuccess("");
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 font-inter text-neutral-charcoal text-sm"
                  />
                </View>

                {resetError ? (
                  <Text className="text-red-500 font-inter text-xs mb-4 ml-1">
                    {resetError}
                  </Text>
                ) : null}

                {resetSuccess ? (
                  <Text className="text-green-600 font-inter text-xs mb-4 ml-1">
                    {resetSuccess}
                  </Text>
                ) : null}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setForgotStep(1)}
                    className="flex-1 border border-gray-200 py-3.5 rounded-2xl items-center"
                  >
                    <Text className="text-neutral-steel font-poppins-bold text-xs">Resend OTP</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleVerifyOTPAndReset}
                    disabled={resetLoading}
                    activeOpacity={0.9}
                    className="flex-[2] overflow-hidden rounded-2xl shadow-sm"
                  >
                    <View className="bg-[#FF5E00] py-3.5 items-center flex-row justify-center">
                      {resetLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-white font-poppins-bold text-sm">
                          Reset Password
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
