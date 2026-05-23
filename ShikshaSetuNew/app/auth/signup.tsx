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
import { useSignUp } from "@/utils/mockAuth";

export default function SignupScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { signUp, setActive, isLoaded } = useSignUp();

  // Form State
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Modal State
  const [isOtpVisible, setIsOtpVisible] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [modalError, setModalError] = useState("");

  // References for 6-Digit OTP inputs to manage focus
  const o1 = useRef<TextInput>(null);
  const o2 = useRef<TextInput>(null);
  const o3 = useRef<TextInput>(null);
  const o4 = useRef<TextInput>(null);
  const o5 = useRef<TextInput>(null);
  const o6 = useRef<TextInput>(null);
  const refs = [o1, o2, o3, o4, o5, o6];

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
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    setError("");
    return true;
  };

  const handleSignUpSubmit = async () => {
    if (!validateInput()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setTimer(45);
      setOtpCode(["", "", "", "", "", ""]);
      setModalError("");
      setIsOtpVisible(true);
    } catch (err: any) {
      console.error(err);
      const errMsg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Something went wrong during sign up.";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleanedText = text.replace(/[^0-9]/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = cleanedText;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (cleanedText && index < 5) {
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

  const handleVerifyOtp = async () => {
    const code = otpCode.join("");
    if (code.length < 6) {
      return;
    }

    setIsVerifying(true);
    setModalError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        setVerificationSuccess(true);

        setTimeout(async () => {
          await setActive({ session: result.createdSessionId });
          setIsOtpVisible(false);
          setVerificationSuccess(false);
          router.replace("/");
        }, 1500);
      } else {
        console.error("Sign-up attempt not complete:", result);
        setModalError("Verification was not complete. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Invalid verification code.";
      setModalError(errMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (timer === 0) {
      try {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setTimer(45);
        setOtpCode(["", "", "", "", "", ""]);
        setModalError("");
        o1.current?.focus();
      } catch (err: any) {
        const errMsg =
          err?.errors?.[0]?.message ||
          err?.message ||
          "Error resending code.";
        setModalError(errMsg);
      }
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
              Create your account
            </Text>
            <Text className="text-sm font-inter text-neutral-steel text-center mb-3">
              Start your learning journey today ✨
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
                placeholder="Enter your password (min 6 chars)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-inter text-neutral-charcoal text-[15px]"
              />
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
              onPress={handleSignUpSubmit}
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
                      Sign Up
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
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/auth/signin" as any)}>
              <Text className="font-poppins-bold text-[#FF5E00] text-sm">
                Log in
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
                  Verify Email
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
                  We've sent a 6-digit verification code to{" "}
                  <Text className="font-inter-medium text-neutral-charcoal">
                    {emailAddress}
                  </Text>
                </Text>
              </View>

              {/* Custom 6-Digit OTP Boxes */}
              <View className="flex-row justify-center space-x-2 mb-4">
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
                    className="w-11 h-12 bg-[#FDF9F1] border-2 border-gray-200 focus:border-[#FF8300] rounded-xl text-center font-poppins-bold text-lg text-neutral-charcoal shadow-sm"
                  />
                ))}
              </View>

              {modalError ? (
                <Text className="text-red-500 font-inter text-xs text-center mb-4">
                  {modalError}
                </Text>
              ) : null}

              {/* Resend & Timer */}
              <View className="items-center mb-6">
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
                  disabled={isVerifying || otpCode.join("").length < 6}
                  className={`py-4 rounded-2xl items-center flex-row justify-center shadow-md ${
                    otpCode.join("").length < 6 || isVerifying
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
