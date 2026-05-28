import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Header from '../../../components/student/Header';
import BottomNavBar from '../../../components/student/BottomNavBar';

export default function HomeworkScoreScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View className="flex-1 bg-[#fbf9f8]">
      <Header />
      <View className="flex-1 justify-center items-center">
        <Text className="font-poppins-bold text-lg text-[#0D1B2A]">
          Homework Score
        </Text>
        <Text className="font-inter text-sm text-gray-500 mt-2">
          Coming in Batch 2
        </Text>
      </View>
      <BottomNavBar />
    </View>
  );
}
