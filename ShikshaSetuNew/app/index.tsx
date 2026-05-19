import { Text, View, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center bg-neutral-cream p-4">
      <Text className="text-4xl text-margam-orange font-poppins-bold text-center mb-4">
        Margam
      </Text>
      <Text className="text-xl text-margam-navy font-poppins font-medium text-center mb-6 mt-[90px]">
        Design System Ready
      </Text>

      <View className="bg-neutral-white p-6 rounded-2xl shadow-sm w-full max-w-sm mb-4">
        <Text className="text-lg text-neutral-charcoal font-inter-medium mb-2">
          This is an example card.
        </Text>
        <Text className="text-sm text-neutral-steel font-inter mb-4">
          It uses Inter for body text and is wrapped in a container using NativeWind and Tailwind v4 CSS variables.
        </Text>

        <View className="flex-row justify-between mt-4">
          <View className="bg-margam-yellow px-4 py-2 rounded-full">
            <Text className="text-margam-navy font-opensans font-bold text-xs">Primary</Text>
          </View>
          <View className="bg-gurukul-navy px-4 py-2 rounded-full">
            <Text className="text-neutral-white font-opensans font-bold text-xs">Gurukul</Text>
          </View>
        </View>
      </View>

      <Link href="/onboarding" asChild>
        <TouchableOpacity className="mt-8 bg-margam-orange px-6 py-3 rounded-xl shadow-sm">
          <Text className="text-neutral-white font-poppins-bold text-lg">
            View Onboarding
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
