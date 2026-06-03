import React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/student/Header";
import BottomNavBar from "../components/student/BottomNavBar";
import { useStudentReportCard } from "../hooks/useStudentReportCard";

export default function ReportCardScreen() {
  const router = useRouter();
  const { 
    academicYears, 
    selectedAcademicYearId, 
    reportCard, 
    isLoading, 
    error, 
    setSelectedAcademicYearId, 
    refetch 
  } = useStudentReportCard();

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F9F6EF" }}>
      {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}
      
      <Header />
      
      <View style={{ flex: 1 }}>
        {isLoading && !reportCard ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
            <Ionicons name="warning-outline" size={48} color="#EF4444" />
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#111827", textAlign: "center", marginTop: 12 }}>
              Failed to load report card
            </Text>
            <Text style={{ fontFamily: "Inter-Regular", fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 6, marginBottom: 20 }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={refetch}
              style={{ backgroundColor: "#D4AF37", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 100 }}
            >
              <Text style={{ fontFamily: "Poppins-Bold", color: "#0D1B2A", fontSize: 13 }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
              </TouchableOpacity>
              <Text className="font-poppins-bold text-2xl text-[#0D1B2A]">Report Card</Text>
            </View>

            {/* Academic Year Selector Chips */}
            {academicYears.length > 1 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 16, gap: 8 }}
              >
                {academicYears.map((ay) => {
                  const isSelected = ay.id === selectedAcademicYearId;
                  return (
                    <TouchableOpacity
                      key={ay.id}
                      onPress={() => setSelectedAcademicYearId(ay.id)}
                      style={{
                        backgroundColor: isSelected ? "#0D1B2A" : "white",
                        borderColor: isSelected ? "#0D1B2A" : "#E5E7EB",
                        borderWidth: 1,
                        borderRadius: 100,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins-SemiBold",
                          fontSize: 12,
                          color: isSelected ? "white" : "#4B5563",
                        }}
                      >
                        {ay.label} {ay.is_current ? "• Active" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Overall Score Card */}
            {reportCard && (
              <View style={{ backgroundColor: "#0D1B2A", borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
                <Text style={{ fontFamily: "Inter-Regular", fontSize: 12, color: "#9CA3AF" }}>Academic Year {reportCard.academicYearLabel}</Text>
                
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <View>
                    <Text style={{ fontFamily: "Inter-Regular", fontSize: 11, color: "#9CA3AF" }}>Overall Average</Text>
                    <Text style={{ fontFamily: "Poppins-Bold", fontSize: 32, color: "#FFFFFF", marginTop: 4 }}>
                      {reportCard.overallAvg}%
                    </Text>
                  </View>
                  
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFFFFF15", alignItems: "center", alignSelf: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: "Poppins-Bold", fontSize: 24, color: "#D4AF37" }}>
                      {reportCard.overallGrade}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Subject Grades Table */}
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#0D1B2A", marginBottom: 12 }}>Subject-wise Marks</Text>

            {!reportCard || reportCard.subjects.length === 0 ? (
              <View style={{ backgroundColor: "white", padding: 24, borderRadius: 20, borderWidth: 1, borderColor: "#F3F4F6", alignItems: "center", justifyContent: "center", height: 160 }}>
                <Ionicons name="documents-outline" size={40} color="#9CA3AF" />
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#1F2937", marginTop: 8 }}>No exam marks recorded yet</Text>
                <Text style={{ fontFamily: "Inter-Regular", fontSize: 12, color: "#6B7280", marginTop: 2 }}>Results will display after exams are graded.</Text>
              </View>
            ) : (
              reportCard.subjects.map((sub, i) => {
                const pct = sub.percentage;
                let gradeColor = "#DC2626"; // F/D
                if (pct >= 90) gradeColor = "#059669"; // A+
                else if (pct >= 80) gradeColor = "#10B981"; // A
                else if (pct >= 70) gradeColor = "#2563EB"; // B
                else if (pct >= 60) gradeColor = "#7C3AED"; // C

                return (
                  <View
                    key={i}
                    style={{
                      backgroundColor: "white",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: "#F3F4F6",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.02,
                      shadowRadius: 3,
                      elevation: 1
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#1F2937" }}>
                          {sub.subject_name}
                        </Text>
                        <Text style={{ fontFamily: "Inter-Regular", fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                          {sub.exam_name}
                        </Text>
                      </View>
                      
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontFamily: "Poppins-Bold", fontSize: 18, color: gradeColor }}>
                          {sub.grade}
                        </Text>
                        <Text style={{ fontFamily: "Inter-Medium", fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                          {sub.percentage}%
                        </Text>
                      </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View>
                        <Text style={{ fontFamily: "Inter-Regular", fontSize: 10, color: "#9CA3AF" }}>Marks Obtained</Text>
                        <Text style={{ fontFamily: "Inter-Medium", fontSize: 13, color: "#1F2937", marginTop: 2 }}>
                          {sub.marks_obtained} / {sub.max_marks}
                        </Text>
                      </View>
                      
                      {sub.remarks ? (
                        <View style={{ flex: 1, alignItems: "flex-end", marginLeft: 16 }}>
                          <Text style={{ fontFamily: "Inter-Regular", fontSize: 10, color: "#9CA3AF" }}>Remarks</Text>
                          <Text style={{ fontFamily: "Inter-Regular", fontSize: 12, color: "#4B5563", marginTop: 2, fontStyle: "italic" }} numberOfLines={1}>
                            "{sub.remarks}"
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
      <BottomNavBar />
    </View>
  );
}