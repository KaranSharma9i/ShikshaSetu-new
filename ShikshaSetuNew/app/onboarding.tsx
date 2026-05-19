import { useState } from "react";
import { View, Text, Image, TouchableOpacity, SafeAreaView, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";

type Role = 'Student' | 'Teacher' | 'School' | null;

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);

  const handleGetStarted = () => {
    if (selectedRole === 'Student') {
      router.push("/auth/student");
    } else if (selectedRole === 'Teacher') {
      router.push("/auth/teacher");
    } else if (selectedRole === 'School') {
      router.push("/auth/school");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* Top bar */}
        <View className="flex-row justify-between items-center p-6">
          <View className="flex-1" />
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text className="text-neutral-steel font-inter font-medium text-base">Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Logo and Name */}
        <View className="items-center justify-center flex-row mb-6 mt-4">
          <Image 
            source={require('../assets/icon.png')}
            className="w-16 h-16 mr-3"
            resizeMode="contain"
          />
          <View>
            <Text className="text-4xl font-poppins-bold text-[#E54D2E]">
              Shiksha<Text className="text-[#FF8300]">Setu</Text>
            </Text>
          </View>
        </View>

        {/* Welcome Text */}
        <View className="items-center px-6 mt-4">
          <Text className="text-3xl font-poppins-bold text-neutral-charcoal text-center mb-3">
            Welcome to <Text className="text-[#FF8300]">ShikshaSetu</Text>
          </Text>
          <Text className="text-base font-inter text-neutral-steel text-center">
            Your bridge to knowledge, skills{'\n'}and a brighter future.
          </Text>
        </View>

        {/* Mascot Image */}
        <View className="flex-1 justify-center items-center my-4">
           <Image 
              source={require('../assets/mascot.png')}
              className="w-72 h-72"
              resizeMode="contain"
           />
        </View>

        {/* Bottom Card */}
        <View className="bg-white rounded-3xl mx-4 mb-8 p-5 shadow-sm border border-gray-100">
          <Text className="text-center font-inter text-neutral-steel text-sm mb-4">Select your role to continue</Text>
          <View className="flex-row justify-between items-center mb-6 space-x-2">
            
            {/* Student Role */}
            <Pressable 
              onPress={() => setSelectedRole('Student')}
              className={`flex-1 items-center justify-center p-3 rounded-2xl border ${selectedRole === 'Student' ? 'bg-[#FF4500] border-[#FF4500] shadow-md scale-105' : 'bg-[#FDF9F1] border-gray-100'}`}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${selectedRole === 'Student' ? 'bg-white/20' : 'bg-white'}`}>
                <Text className="text-xl">🎓</Text>
              </View>
              <Text className={`font-poppins-bold text-[12px] leading-tight ${selectedRole === 'Student' ? 'text-white' : 'text-neutral-charcoal'}`}>Student</Text>
            </Pressable>
            
            {/* Teacher Role */}
            <Pressable 
              onPress={() => setSelectedRole('Teacher')}
              className={`flex-1 items-center justify-center p-3 rounded-2xl border ${selectedRole === 'Teacher' ? 'bg-[#FF4500] border-[#FF4500] shadow-md scale-105' : 'bg-[#FDF9F1] border-gray-100'}`}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${selectedRole === 'Teacher' ? 'bg-white/20' : 'bg-white'}`}>
                <Text className="text-xl">👩‍🏫</Text>
              </View>
              <Text className={`font-poppins-bold text-[12px] leading-tight ${selectedRole === 'Teacher' ? 'text-white' : 'text-neutral-charcoal'}`}>Teacher</Text>
            </Pressable>

            {/* School Role */}
            <Pressable 
              onPress={() => setSelectedRole('School')}
              className={`flex-1 items-center justify-center p-3 rounded-2xl border ${selectedRole === 'School' ? 'bg-[#FF4500] border-[#FF4500] shadow-md scale-105' : 'bg-[#FDF9F1] border-gray-100'}`}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${selectedRole === 'School' ? 'bg-white/20' : 'bg-white'}`}>
                <Text className="text-xl">🏫</Text>
              </View>
              <Text className={`font-poppins-bold text-[12px] leading-tight ${selectedRole === 'School' ? 'text-white' : 'text-neutral-charcoal'}`}>School</Text>
            </Pressable>

          </View>

          <TouchableOpacity 
            className={`py-4 rounded-2xl items-center flex-row justify-center ${selectedRole ? 'bg-[#FF4500]' : 'bg-gray-300'}`}
            onPress={handleGetStarted}
            disabled={!selectedRole}
          >
            <Text className="text-white font-poppins-bold text-lg mr-2">Get Started</Text>
            <Text className="text-white text-lg">→</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
