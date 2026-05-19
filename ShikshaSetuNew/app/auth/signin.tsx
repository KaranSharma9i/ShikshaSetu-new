import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";

export default function SigninScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();

  // Form State
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  // OTP Modal State
  const [isOtpVisible, setIsOtpVisible] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // References for OTP inputs to manage focus
  const o1 = useRef<TextInput>(null);
  const o2 = useRef<TextInput>(null);
  const o3 = useRef<TextInput>(null);
  const o4 = useRef<TextInput>(null);
  const refs = [o1, o2, o3, o4];

  // Countdown timer effect for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpVisible && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpVisible, timer]);

  const handleTabChange = (tab: "email" | "phone") => {
    setActiveTab(tab);
    setInputValue("");
    setError("");
  };

  const validateInput = () => {
    if (!inputValue.trim()) {
      setError(
        activeTab === "email"
          ? "Please enter your email address"
          : "Please enter your mobile number"
      );
      return false;
    }

    if (activeTab === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputValue.trim())) {
        setError("Please enter a valid email address");
        return false;
      }
    } else {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(inputValue.replace(/\D/g, ""))) {
        setError("Please enter a valid 10-digit mobile number");
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleGetOtp = () => {
    if (validateInput()) {
      setTimer(45);
      setOtpCode(["", "", "", ""]);
      setIsOtpVisible(true);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleanedText = text.replace(/[^0-9]/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = cleanedText;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (cleanedText && index < 3) {
      refs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otpCode[index] && index > 0) {
      const newOtp = [...otpCode];
      newOtp[index - 1] = "";
      setOtpCode(newOtp);
      refs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const code = otpCode.join("");
    if (code.length < 4) {
      return;
    }

    setIsVerifying(true);

    // Simulate OTP verification API call
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationSuccess(true);

      // Simulate sign in complete and redirect
      setTimeout(() => {
        setIsOtpVisible(false);
        setVerificationSuccess(false);
        // Direct to Homepage index or role dashboard
        router.replace("/");
      }, 1500);
    }, 1500);
  };

  const handleResendCode = () => {
    if (timer === 0) {
      setTimer(45);
      setOtpCode(["", "", "", ""]);
      o1.current?.focus();
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
            {/* Tab Switched */}
            <Text className="font-inter-medium text-neutral-steel text-sm mb-3">
              Sign in with
            </Text>
            
            <View className="flex-row space-x-3 mb-5">
              <TouchableOpacity
                onPress={() => handleTabChange("email")}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ${
                  activeTab === "email"
                    ? "bg-[#FFF4E5] border-[#FF8300]"
                    : "bg-[#FDF9F1] border-gray-100"
                }`}
              >
                <Feather
                  name="mail"
                  size={16}
                  color={activeTab === "email" ? "#FF8300" : "#6B7280"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`font-poppins-bold text-sm ${
                    activeTab === "email" ? "text-[#FF8300]" : "text-[#6B7280]"
                  }`}
                >
                  Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleTabChange("phone")}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ${
                  activeTab === "phone"
                    ? "bg-[#FFF4E5] border-[#FF8300]"
                    : "bg-[#FDF9F1] border-gray-100"
                }`}
              >
                <Feather
                  name="phone"
                  size={16}
                  color={activeTab === "phone" ? "#FF8300" : "#6B7280"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`font-poppins-bold text-sm ${
                    activeTab === "phone" ? "text-[#FF8300]" : "text-[#6B7280]"
                  }`}
                >
                  Phone
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Label & Field */}
            <Text className="font-poppins-bold text-neutral-charcoal text-sm mb-2">
              {activeTab === "email" ? "Email Address" : "Mobile Number"}
            </Text>

            <View
              className={`flex-row items-center bg-[#FCFAFA] border px-4 py-3.5 rounded-2xl mb-1 ${
                error ? "border-red-500" : "border-gray-200/80"
              }`}
            >
              <Feather
                name={activeTab === "email" ? "mail" : "phone"}
                size={18}
                color="#9CA3AF"
                style={{ marginRight: 10 }}
              />
              {activeTab === "phone" && (
                <Text className="font-poppins-bold text-neutral-charcoal mr-2 border-r border-gray-300 pr-2">
                  +91
                </Text>
              )}
              <TextInput
                value={inputValue}
                onChangeText={(text) => {
                  setInputValue(text);
                  setError("");
                }}
                placeholder={
                  activeTab === "email"
                    ? "Enter your email address"
                    : "Enter your 10-digit mobile number"
                }
                placeholderTextColor="#9CA3AF"
                keyboardType={activeTab === "email" ? "email-address" : "phone-pad"}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-inter text-neutral-charcoal text-[15px]"
              />
            </View>

            {error ? (
              <Text className="text-red-500 font-inter text-xs mb-4 ml-1">
                {error}
              </Text>
            ) : (
              <View className="h-4" />
            )}

            {/* Action CTA Button */}
            <TouchableOpacity
              onPress={handleGetOtp}
              activeOpacity={0.9}
              className="overflow-hidden rounded-2xl shadow-md mt-2"
            >
              <View className="bg-gradient-to-r bg-[#FF5E00] py-4 items-center flex-row justify-center">
                <Text className="text-white font-poppins-bold text-base mr-2">
                  Sign In
                </Text>
                <Feather name="arrow-right" size={16} color="white" />
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

      {/* OTP Verification Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isOtpVisible}
        onRequestClose={() => setIsOtpVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View className="bg-white rounded-t-[36px] p-6 shadow-2xl border-t border-gray-100">
              {/* Top Drag indicator / close bar */}
              <View className="align-center items-center mb-6">
                <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </View>

              {/* Modal Back / Header */}
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity
                  onPress={() => setIsOtpVisible(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#4B5563" />
                </TouchableOpacity>
                <Text className="font-poppins-bold text-lg text-neutral-charcoal">
                  Verify OTP
                </Text>
                <View className="w-8" />
              </View>

              {/* Status Graphic */}
              <View className="items-center mb-5 mt-2">
                <View className="w-16 h-16 bg-[#FFF4E5] rounded-full items-center justify-center mb-3">
                  <Feather name="shield" size={28} color="#FF8300" />
                </View>
                <Text className="font-poppins-bold text-lg text-neutral-charcoal text-center mb-1">
                  Enter Verification Code
                </Text>
                <Text className="font-inter text-neutral-steel text-sm text-center px-4">
                  We've sent a 4-digit code to{" "}
                  <Text className="font-inter-medium text-neutral-charcoal">
                    {activeTab === "phone" ? `+91 ${inputValue}` : inputValue}
                  </Text>
                </Text>
              </View>

              {/* Custom 4-Digit OTP Boxes */}
              <View className="flex-row justify-center space-x-4 mb-6">
                {otpCode.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={refs[idx]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    className="w-14 h-14 bg-[#FDF9F1] border-2 border-gray-200 focus:border-[#FF8300] rounded-xl text-center font-poppins-bold text-xl text-neutral-charcoal shadow-sm"
                  />
                ))}
              </View>

              {/* Resend & Timer */}
              <View className="items-center mb-8">
                {timer > 0 ? (
                  <Text className="font-inter text-neutral-steel text-sm">
                    Resend code in{" "}
                    <Text className="font-poppins-bold text-[#FF8300]">
                      00:{timer < 10 ? `0${timer}` : timer}
                    </Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendCode}>
                    <Text className="font-poppins-bold text-[#FF8300] text-sm underline">
                      Resend Verification Code
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Verify Button */}
              {verificationSuccess ? (
                <View className="bg-emerald-500 py-4 rounded-2xl items-center flex-row justify-center shadow-lg">
                  <Feather
                    name="check-circle"
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-poppins-bold text-base">
                    Verification Successful!
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={isVerifying || otpCode.join("").length < 4}
                  className={`py-4 rounded-2xl items-center flex-row justify-center shadow-md ${
                    otpCode.join("").length < 4 || isVerifying
                      ? "bg-gray-300"
                      : "bg-[#FF5E00]"
                  }`}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text className="text-white font-poppins-bold text-base mr-2">
                        Verify & Continue
                      </Text>
                      <Feather name="check" size={16} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
