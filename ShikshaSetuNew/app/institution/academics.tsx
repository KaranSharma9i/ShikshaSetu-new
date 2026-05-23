import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { schoolData } from "../../constants/schoolData";

export default function AcademicsPortal() {
  const [selectedGrade, setSelectedGrade] = useState<string>("Grade 10");
  const [activeMetricTab, setActiveMetricTab] = useState<"marks" | "score">("marks");
  const [tooltipSubject, setTooltipSubject] = useState<string | null>(null);

  // Filter subjects mock data based on active tab
  const getChartData = () => {
    if (activeMetricTab === "marks") {
      return [
        { label: "MATH", value: 84, labelFull: "Mathematics" },
        { label: "PHYS", value: 76, labelFull: "Physics" },
        { label: "ENGL", value: 92, labelFull: "English" },
        { label: "CHEM", value: 68, labelFull: "Chemistry" },
      ];
    } else {
      return [
        { label: "MATH", value: 76, labelFull: "Mathematics" }, // 3.8 out of 5.0 -> 76%
        { label: "PHYS", value: 70, labelFull: "Physics" }, // 3.5 out of 5.0 -> 70%
        { label: "ENGL", value: 84, labelFull: "English" }, // 4.2 out of 5.0 -> 84%
        { label: "CHEM", value: 58, labelFull: "Chemistry" }, // 2.9 out of 5.0 -> 58%
      ];
    }
  };

  const chartData = getChartData();

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <Header title="Academics" />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header Block */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-[11px] font-poppins-semibold text-[#735c00] tracking-widest uppercase mb-1">
            Department Performance
          </Text>
          <Text className="text-2xl font-poppins-bold text-[#0F1C2C] leading-tight">
            Academic Performance
          </Text>
        </View>

        {/* Grade Selector Dropdown Simulation */}
        <View className="px-5 mb-5 flex-row justify-between items-center">
          <Text className="text-xs font-inter text-neutral-steel">
            Viewing records for class:
          </Text>
          <View className="flex-row bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {["Grade 9", "Grade 10", "Grade 11"].map((grade) => (
              <TouchableOpacity
                key={grade}
                onPress={() => {
                  setSelectedGrade(grade);
                  setTooltipSubject(null);
                }}
                className={`px-3 py-2 ${
                  selectedGrade === grade ? "bg-[#0F1C2C]" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-poppins-semibold ${
                    selectedGrade === grade ? "text-[#ffe088]" : "text-[#0F1C2C]"
                  }`}
                >
                  {grade}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Class-wise Performance Table Section */}
        <View className="px-5 mb-6">
          <View className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#0F1C2C] font-poppins-bold text-base">
                Class-wise Performance
              </Text>
              <Ionicons name="trending-up-outline" size={20} color="#735c00" />
            </View>

            {/* Table Header */}
            <View className="flex-row border-b border-gray-100 pb-2 mb-2">
              <Text className="flex-[2] text-[10px] font-poppins-semibold text-[#778598] uppercase">
                Class
              </Text>
              <Text className="flex-1 text-right text-[10px] font-poppins-semibold text-[#778598] uppercase">
                Avg. Marks
              </Text>
              <Text className="flex-1.5 text-right text-[10px] font-poppins-semibold text-[#778598] uppercase">
                Avg. Score
              </Text>
              <Text className="flex-1 text-right text-[10px] font-poppins-semibold text-[#778598] uppercase">
                Growth
              </Text>
            </View>

            {/* Table Body */}
            {schoolData.classes.map((cls) => (
              <View
                key={cls.id}
                className="flex-row items-center py-3 border-b border-gray-50 last:border-0"
              >
                <Text className="flex-[2] font-poppins-semibold text-xs text-[#0F1C2C]">
                  {cls.name}
                </Text>
                <Text className="flex-1 text-right font-inter text-xs text-neutral-steel font-medium">
                  {cls.avgMarks}
                </Text>
                <Text className="flex-1.5 text-right font-inter text-xs text-neutral-steel font-medium">
                  {cls.avgAiScore}
                </Text>
                <Text
                  className={`flex-1 text-right font-poppins-bold text-xs ${
                    cls.isPositive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {cls.growth}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Subject wise Marks Analysis */}
        <View className="px-5 mb-6">
          <View className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <View className="mb-4">
              <Text className="text-[#0F1C2C] font-poppins-bold text-base">
                Subject Analytics
              </Text>
              <Text className="text-neutral-steel font-inter text-[11px]">
                Comparative analysis per curriculum pillar.
              </Text>
            </View>

            {/* Selector Tab (Marks vs AI Scores) */}
            <View className="flex-row bg-[#FDF9F1] p-1 rounded-xl mb-6">
              <TouchableOpacity
                onPress={() => {
                  setActiveMetricTab("marks");
                  setTooltipSubject(null);
                }}
                className={`flex-1 py-2.5 rounded-lg items-center ${
                  activeMetricTab === "marks" ? "bg-[#0F1C2C]" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-poppins-bold ${
                    activeMetricTab === "marks" ? "text-[#ffe088]" : "text-neutral-steel"
                  }`}
                >
                  Exam Marks
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveMetricTab("score");
                  setTooltipSubject(null);
                }}
                className={`flex-1 py-2.5 rounded-lg items-center ${
                  activeMetricTab === "score" ? "bg-[#0F1C2C]" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-poppins-bold ${
                    activeMetricTab === "score" ? "text-[#ffe088]" : "text-neutral-steel"
                  }`}
                >
                  AI Homework Score
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Bar Chart Drawing */}
            <View className="h-56 flex-row items-end justify-around px-2 pt-6 pb-2 border-b border-gray-100 relative">
              {/* Grid Lines background */}
              <View className="absolute inset-x-0 bottom-0 h-full flex justify-between pointer-events-none opacity-[0.03]">
                <View className="border-t border-[#0F1C2C] w-full" />
                <View className="border-t border-[#0F1C2C] w-full" />
                <View className="border-t border-[#0F1C2C] w-full" />
                <View className="border-t border-[#0F1C2C] w-full" />
              </View>

              {chartData.map((item) => {
                const isSelected = tooltipSubject === item.label;
                return (
                  <View key={item.label} className="items-center flex-1 mx-2">
                    {/* Tooltip Overlay */}
                    {isSelected && (
                      <View className="absolute -top-12 bg-[#0F1C2C] px-2 py-1.5 rounded shadow-md z-40 border border-gray-800">
                        <Text className="text-white text-[9px] font-poppins font-bold whitespace-nowrap">
                          {item.value}% Avg
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setTooltipSubject(isSelected ? null : item.label)}
                      className="w-full max-w-[32px] justify-end"
                      style={{ height: 160 }}
                    >
                      <View
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isSelected ? "bg-[#735c00]" : "bg-[#0F1C2C]"
                        }`}
                        style={{ height: `${item.value}%` }}
                      />
                    </TouchableOpacity>
                    <Text className="text-[10px] font-poppins-bold text-[#778598] mt-2">
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text className="text-center font-inter text-[10px] text-neutral-steel mt-2 italic">
              Tap any bar to inspect average performance
            </Text>
          </View>
        </View>

        {/* Subjects Details Bento Lists */}
        <View className="px-5">
          <Text className="text-[#0F1C2C] font-poppins-bold text-base mb-3 px-1">
            Departmental Breakdown ({selectedGrade})
          </Text>

          {schoolData.subjects.map((sub) => (
            <View
              key={sub.id}
              className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm mb-4"
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center space-x-2">
                  <View className="w-9 h-9 rounded-lg bg-[#0F1C2C]/5 items-center justify-center">
                    <Ionicons name={sub.icon as any} size={18} color="#0F1C2C" />
                  </View>
                  <View>
                    <Text className="font-poppins-bold text-sm text-[#0F1C2C]">
                      {sub.subject}
                    </Text>
                    <Text className="text-[10px] text-neutral-steel">
                      {sub.topic}
                    </Text>
                  </View>
                </View>

                <View
                  className={`px-2 py-0.5 rounded-full ${
                    sub.difficulty === "High"
                      ? "bg-rose-50 border border-rose-100"
                      : sub.difficulty === "Medium"
                      ? "bg-amber-50 border border-amber-100"
                      : "bg-emerald-50 border border-emerald-100"
                  }`}
                >
                  <Text
                    className={`font-poppins-semibold text-[8px] uppercase tracking-wide ${
                      sub.difficulty === "High"
                        ? "text-rose-600"
                        : sub.difficulty === "Medium"
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {sub.difficulty} Difficulty
                  </Text>
                </View>
              </View>

              {/* Subject metrics row */}
              <View className="flex-row justify-between items-center border-t border-gray-100 pt-3">
                <View>
                  <Text className="text-[10px] text-neutral-steel font-inter">Avg Exam Marks</Text>
                  <Text className="text-[#0f1c2c] font-poppins-bold text-sm">{sub.avgMarks}/100</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-neutral-steel font-inter">Avg Homework Score</Text>
                  <Text className="text-[#735c00] font-poppins-bold text-sm">{sub.avgScore} GPA</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[9px] text-[#778598] font-inter">Top Student</Text>
                  <Text className="text-[#0F1C2C] font-poppins-semibold text-xs">{sub.topPerformer}</Text>
                </View>
              </View>

              {/* Status footer inside card */}
              <View className="bg-[#FDF9F1] rounded-xl p-3 mt-3 flex-row justify-between items-center border border-gray-200/50">
                <View className="flex-row items-center space-x-1.5">
                  <Ionicons name="arrow-up-circle-outline" size={14} color="#059669" />
                  <Text className="text-emerald-700 font-inter text-[10px] font-semibold">
                    {sub.improvementPercent}
                  </Text>
                </View>
                <Text className="text-rose-600 font-poppins-semibold text-[10px]">
                  {sub.needsSupportCount} Students need support
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="academics" />
    </SafeAreaView>
  );
}
