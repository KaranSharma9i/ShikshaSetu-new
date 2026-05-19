import { View, Text, Image, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function OnboardingScreen() {
  const router = useRouter();

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
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-1 items-center flex-row justify-center border-r border-gray-100 pr-1">
              <View className="bg-orange-50 w-8 h-8 rounded-full items-center justify-center mr-1">
                <Text className="text-orange-500 text-sm">📖</Text>
              </View>
              <View className="flex-shrink">
                <Text className="font-poppins-bold text-[11px] text-neutral-charcoal leading-tight" numberOfLines={1}>Learn</Text>
                <Text className="font-inter text-[9px] text-neutral-steel leading-tight" numberOfLines={1}>New Skills</Text>
              </View>
            </View>
            
            <View className="flex-1 items-center flex-row justify-center border-r border-gray-100 px-1">
              <View className="bg-orange-50 w-8 h-8 rounded-full items-center justify-center mr-1">
                <Text className="text-orange-500 text-sm">👥</Text>
              </View>
              <View className="flex-shrink">
                <Text className="font-poppins-bold text-[11px] text-neutral-charcoal leading-tight" numberOfLines={1}>Connect</Text>
                <Text className="font-inter text-[9px] text-neutral-steel leading-tight" numberOfLines={1}>Community</Text>
              </View>
            </View>

            <View className="flex-1 items-center flex-row justify-center pl-1">
              <View className="bg-orange-50 w-8 h-8 rounded-full items-center justify-center mr-1">
                <Text className="text-orange-500 text-sm">📈</Text>
              </View>
              <View className="flex-shrink">
                <Text className="font-poppins-bold text-[11px] text-neutral-charcoal leading-tight" numberOfLines={1}>Grow</Text>
                <Text className="font-inter text-[9px] text-neutral-steel leading-tight" numberOfLines={1}>Your Future</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            className="bg-[#FF4500] py-4 rounded-2xl items-center flex-row justify-center"
            onPress={() => router.push('/')}
          >
            <Text className="text-white font-poppins-bold text-lg mr-2">Get Started</Text>
            <Text className="text-white text-lg">→</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
