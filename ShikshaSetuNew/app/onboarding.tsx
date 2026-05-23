import { View, Text, Image, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/auth/signup' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* Top bar */}
        <View className="flex-row justify-between items-center p-6">
          <View className="flex-1" />
          <TouchableOpacity onPress={() => router.push('/' as any)}>
            <Text className="text-neutral-steel font-inter font-medium text-base">Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Logo and Name */}
        <View className="items-center justify-center mt-6 mb-2">
          <View className="w-36 h-36 bg-white rounded-[32px] items-center justify-center shadow-md border border-orange-100/50 mb-3">
            <Image 
              source={require('../assets/icon.png')}
              style={{ width: 110, height: 110 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-4xl font-poppins-bold text-margam-orange mt-1">
            Mar<Text className="text-margam-yellow">gam</Text>
          </Text>
          <Text className="text-[10px] font-poppins-bold tracking-widest text-margam-orange uppercase mt-1">
            Learn • Connect • Grow
          </Text>
        </View>

        {/* Welcome Text */}
        <View className="items-center px-6 mt-4">
          <Text className="text-3xl font-poppins-bold text-neutral-charcoal text-center mb-3">
            Welcome to <Text className="text-margam-orange">Margam</Text>
          </Text>
          <Text className="text-base font-inter text-neutral-steel text-center">
            Your bridge to knowledge, skills{'\n'}and a brighter future.
          </Text>
        </View>

        {/* Mascot Image */}
        <View className="flex-1 justify-center items-center my-4">
           <Image 
              source={require('../assets/mascot.png')}
              style={{ width: 260, height: 260, maxWidth: '90%' }}
              resizeMode="contain"
           />
        </View>

        {/* Bottom Card */}
        <View className="bg-white rounded-3xl mx-4 mb-8 p-6 shadow-sm border border-gray-100/50">
          <Text className="text-center font-poppins-medium text-neutral-charcoal text-base mb-2">
            Empowering institutions, teachers & students
          </Text>
          <Text className="text-center font-inter text-neutral-steel text-xs mb-6">
            Join the digital learning ecosystem with ease.
          </Text>

          <TouchableOpacity 
            className="py-4 rounded-2xl items-center flex-row justify-center bg-margam-orange shadow-md active:bg-margam-orange/90"
            onPress={handleGetStarted}
          >
            <Text className="text-white font-poppins-bold text-lg mr-2">Get Started</Text>
            <Text className="text-white text-lg">→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="py-3.5 rounded-2xl items-center flex-row justify-center border-2 border-[#0F1C2C] mt-3 active:bg-slate-50"
            onPress={() => router.push('/institution' as any)}
          >
            <Text className="text-[#0F1C2C] font-poppins-bold text-sm">Enter Demo Dashboard (Bypass Auth)</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
