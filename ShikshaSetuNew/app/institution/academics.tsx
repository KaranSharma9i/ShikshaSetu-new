import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { useAuth } from "../../src/hooks/useAuth";
import { useQuery } from "../../src/hooks/useQuery";
import { getClassesPerformance, getSubjectAnalytics } from "../../src/repositories/academicRepository";

const typography = {
  h1: { fontFamily: 'Poppins_700Bold', fontSize: 32, lineHeight: 38 },
  h2: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 29 },
  h3: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 23 },
  h4: { fontFamily: 'Poppins_500Medium', fontSize: 15, lineHeight: 21 },
  bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 26 },
  bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22 },
  bodySm: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 21 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, letterSpacing: 0.24 },
};

const getSubjectEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("english")) return "📚";
  if (lower.includes("hindi")) return "📖";
  if (lower.includes("math")) return "➕";
  if (lower.includes("physics")) return "⚡";
  if (lower.includes("chemistry")) return "🧪";
  if (lower.includes("biology")) return "🧬";
  if (lower.includes("history")) return "🏛️";
  if (lower.includes("geography")) return "🌍";
  if (lower.includes("computer")) return "💻";
  return "📝";
};

const getSubjectAbbreviation = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("mathematics")) return "MATH";
  if (lower.includes("physics")) return "PHYS";
  if (lower.includes("english")) return "ENGL";
  if (lower.includes("chemistry")) return "CHEM";
  if (lower.includes("biology")) return "BIOL";
  if (lower.includes("history")) return "HIST";
  if (lower.includes("geography")) return "GEOG";
  if (lower.includes("hindi")) return "HIND";
  if (lower.includes("computer")) return "COMP";
  return name.slice(0, 4).toUpperCase();
};

const getDifficulty = (avgMarks: number): "LOW" | "MEDIUM" | "HIGH" => {
  if (avgMarks >= 80) return "LOW";
  if (avgMarks >= 65) return "MEDIUM";
  return "HIGH";
};

export default function AcademicsPortal() {
  const { institutionId, theme } = useAuth();
  
  const colors = {
    navyBlue: theme?.colors?.primary ?? '#0D1B2A',
    royalBlue: theme?.colors?.primaryAlt ?? '#162A56',
    gold: theme?.colors?.secondary ?? '#D4AF37',
    lightGold: theme?.colors?.secondaryLight ?? '#F2C14E',
    charcoal: theme?.colors?.charcoal ?? '#333333',
    steelGray: theme?.colors?.steelGray ?? '#6B7280',
    lightGray: theme?.colors?.lightGray ?? '#E5E7EB',
    cream: theme?.colors?.cream ?? '#F7F3EB',
    white: theme?.colors?.white ?? '#FFFFFF',
    success: theme?.colors?.success ?? '#15803d',
    successBg: theme?.colors?.success ? theme.colors.success + '20' : '#dcfce7',
    warning: theme?.colors?.warning ?? '#854d0e',
    warningBg: theme?.colors?.warning ? theme.colors.warning + '20' : '#fef9c3',
    danger: theme?.colors?.danger ?? '#991b1b',
    dangerBg: theme?.colors?.danger ? theme.colors.danger + '20' : '#fee2e2',
  };

  const cardBorderRadius = 12;

  const cardShadow = {
    shadowColor: colors.navyBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  };

  const [selectedClass, setSelectedClass] = useState<string>("Grade 10-B");
  const [showAllClasses, setShowAllClasses] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"marks" | "score">("marks");
  const [tooltipSubject, setTooltipSubject] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const { data: classesPerformance, isLoading: loadingClasses } = useQuery(
    () => getClassesPerformance(institutionId || ""),
    [institutionId]
  );

  const { data: subjectAnalytics, isLoading: loadingAnalytics } = useQuery(
    () => getSubjectAnalytics(institutionId || "", selectedClass),
    [institutionId, selectedClass]
  );

  // Synchronize selectedClass default when data completes loading
  useEffect(() => {
    if (classesPerformance && classesPerformance.length > 0) {
      const exists = classesPerformance.some(c => c.name === selectedClass);
      if (!exists) {
        setSelectedClass(classesPerformance[0].name);
      }
    }
  }, [classesPerformance]);

  const gradeNames = useMemo(() => {
    return classesPerformance?.map(c => c.name) || [];
  }, [classesPerformance]);

  // Derive strip summary values
  const summaryStripStats = useMemo(() => {
    if (!classesPerformance || classesPerformance.length === 0) {
      return { avgMarks: "0.0%", avgScore: "N/A", totalClasses: "0" };
    }
    const totalMarks = classesPerformance.reduce((sum, cls) => {
      const val = parseFloat(cls.avgMarks.replace("%", ""));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    let validScoreCount = 0;
    const totalScore = classesPerformance.reduce((sum, cls) => {
      if (cls.avgAiScore && cls.avgAiScore !== "N/A") {
        const val = parseFloat(cls.avgAiScore.split("/")[0]);
        if (!isNaN(val)) {
          validScoreCount++;
          return sum + val;
        }
      }
      return sum;
    }, 0);

    return {
      avgMarks: `${(totalMarks / classesPerformance.length).toFixed(1)}%`,
      avgScore: validScoreCount > 0 ? `${(totalScore / validScoreCount).toFixed(1)}/10.0` : "N/A",
      totalClasses: classesPerformance.length.toString(),
    };
  }, [classesPerformance]);

  // Filter or list class performance based on view state
  const displayedClasses = useMemo(() => {
    if (!classesPerformance) return [];
    if (showAllClasses) return classesPerformance;
    return classesPerformance.filter(c => c.name === selectedClass);
  }, [classesPerformance, selectedClass, showAllClasses]);

  // Chart data setup
  const chartData = useMemo(() => {
    return subjectAnalytics || [];
  }, [subjectAnalytics]);

  const hasAiScores = useMemo(() => {
    if (!subjectAnalytics || subjectAnalytics.length === 0) return false;
    return subjectAnalytics.some(sub => sub.avgScore !== null && sub.avgScore !== undefined && sub.avgScore > 0);
  }, [subjectAnalytics]);

  useEffect(() => {
    if (!hasAiScores) {
      setActiveTab("marks");
    }
  }, [hasAiScores]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Header title="ACADEMICS" showBackButton={true} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* B. Summary Strip */}
        <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 16 }}>
          {/* Card 1: Avg Marks */}
          <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: cardBorderRadius, borderWidth: 1, borderColor: colors.lightGray, padding: 12, ...cardShadow }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <Ionicons name="bar-chart-outline" size={14} color={colors.steelGray} />
              <Text style={[typography.caption, { color: colors.steelGray, fontWeight: "600" }]}>
                Avg Marks
              </Text>
            </View>
            <Text style={[typography.h3, { color: colors.navyBlue }]}>
              {summaryStripStats.avgMarks === "N/A" || summaryStripStats.avgMarks === "0.0%" ? "—" : summaryStripStats.avgMarks}
            </Text>
          </View>

          {/* Card 2: Avg Score */}
          <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: cardBorderRadius, borderWidth: 1, borderColor: colors.lightGray, padding: 12, ...cardShadow }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <Ionicons name="star-outline" size={14} color={colors.steelGray} />
              <Text style={[typography.caption, { color: colors.steelGray, fontWeight: "600" }]}>
                Avg Score
              </Text>
            </View>
            <Text style={[typography.h3, { color: colors.gold }]}>
              {summaryStripStats.avgScore === "N/A" ? "—" : summaryStripStats.avgScore}
            </Text>
          </View>

          {/* Card 3: Classes */}
          <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: cardBorderRadius, borderWidth: 1, borderColor: colors.lightGray, padding: 12, ...cardShadow }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <Ionicons name="school-outline" size={14} color={colors.steelGray} />
              <Text style={[typography.caption, { color: colors.steelGray, fontWeight: "600" }]}>
                Classes
              </Text>
            </View>
            <Text style={[typography.h3, { color: colors.navyBlue }]}>
              {summaryStripStats.totalClasses === "N/A" ? "—" : summaryStripStats.totalClasses}
            </Text>
          </View>
        </View>

        {/* Custom Dropdown Trigger */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text style={[typography.caption, { color: colors.steelGray, marginBottom: 6, letterSpacing: 0.5, fontWeight: "600" }]}>
            SELECT CLASS & SECTION
          </Text>
          <TouchableOpacity
            onPress={() => setIsDropdownOpen(true)}
            disabled={loadingClasses}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: colors.white,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: cardBorderRadius,
              borderWidth: 1,
              borderColor: isDropdownOpen ? colors.navyBlue : colors.lightGray,
              opacity: loadingClasses ? 0.6 : 1.0,
            }}
          >
            <Text style={[typography.bodyMd, { color: colors.navyBlue, fontFamily: "Poppins_600SemiBold" }]}>
              {loadingClasses ? "Loading classes..." : selectedClass}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.navyBlue} />
          </TouchableOpacity>
        </View>

        {/* D. Class Performance */}
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[typography.h2, { color: colors.navyBlue }]}>
              Class Performance
            </Text>
            <TouchableOpacity onPress={() => setShowAllClasses(!showAllClasses)}>
              <Text style={[typography.bodyMd, { color: colors.gold, fontFamily: "Poppins_600SemiBold" }]}>
                {showAllClasses ? "Show Selected" : "View All →"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {loadingClasses ? (
              <ActivityIndicator size="small" color={colors.navyBlue} style={{ flex: 1, marginVertical: 20 }} />
            ) : displayedClasses.length === 0 ? (
              <View 
                style={{ 
                  flex: 1, 
                  alignItems: "center", 
                  justifyContent: "center", 
                  paddingVertical: 32, 
                  backgroundColor: colors.white, 
                  borderRadius: cardBorderRadius, 
                  borderWidth: 1, 
                  borderColor: colors.lightGray 
                }}
              >
                <Ionicons name="alert-circle-outline" size={32} color={colors.steelGray} style={{ marginBottom: 8 }} />
                <Text style={[typography.bodySm, { color: colors.steelGray, fontStyle: "italic" }]}>
                  No class records found.
                </Text>
              </View>
            ) : (
              displayedClasses.map((cls) => {
                const isMarksNA = cls.avgMarks === "N/A";
                const isScoreNA = cls.avgAiScore === "N/A";
                const isCardEmpty = isMarksNA && isScoreNA;

                const marksPct = isMarksNA ? NaN : parseFloat(cls.avgMarks.replace("%", ""));
                let marksColor = colors.steelGray;
                if (!isMarksNA) {
                  if (marksPct >= 75) {
                    marksColor = colors.success;
                  } else if (marksPct >= 60) {
                    marksColor = colors.gold;
                  } else {
                    marksColor = colors.danger;
                  }
                }

                const parsedGrowth = parseFloat(cls.growth.replace("%", ""));
                const isZeroGrowth = isNaN(parsedGrowth) || parsedGrowth === 0;

                const isSelected = cls.name === selectedClass;
                return (
                  <TouchableOpacity
                    key={cls.id}
                    onPress={() => {
                      setSelectedClass(cls.name);
                      setTooltipSubject(null);
                    }}
                    activeOpacity={0.9}
                    style={{
                      width: "48%",
                      backgroundColor: colors.white,
                      borderRadius: cardBorderRadius,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? colors.navyBlue : colors.lightGray,
                      padding: 16,
                      opacity: isSelected ? 1.0 : (isCardEmpty ? 0.65 : 1.0),
                      ...cardShadow,
                    }}
                  >
                    {/* Row 1 */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={[typography.h4, { color: colors.navyBlue }]}>
                        {cls.name}
                      </Text>
                      <View
                        style={{
                          backgroundColor: isZeroGrowth 
                            ? colors.lightGray 
                            : (cls.isPositive ? colors.successBg : colors.dangerBg),
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: isZeroGrowth 
                                ? colors.steelGray 
                                : (cls.isPositive ? colors.success : colors.danger),
                              fontWeight: "600",
                            },
                          ]}
                        >
                          {!isZeroGrowth && (cls.isPositive ? "▲ " : "▼ ")}
                          {cls.growth.replace(/[+-]/g, "")}
                        </Text>
                      </View>
                    </View>

                    {/* Row 2 */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <Text style={[typography.caption, { color: colors.steelGray }]}>
                        Marks
                      </Text>
                      {isMarksNA ? (
                        <Text style={[typography.bodySm, { color: colors.steelGray }]}>—</Text>
                      ) : (
                        <Text style={[typography.h4, { color: marksColor }]}>
                          {cls.avgMarks}
                        </Text>
                      )}
                    </View>

                    {/* Row 3 */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <Text style={[typography.caption, { color: colors.steelGray }]}>
                        Score
                      </Text>
                      {isScoreNA ? (
                        <Text style={[typography.bodySm, { color: colors.steelGray }]}>—</Text>
                      ) : (
                        <Text style={[typography.h4, { color: colors.royalBlue }]}>
                          {cls.avgAiScore}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* E. Subject Analytics Card */}
        <View
          style={{
            marginTop: 24,
            marginHorizontal: 16,
            backgroundColor: colors.white,
            borderRadius: cardBorderRadius,
            borderWidth: 1,
            borderColor: colors.lightGray,
            padding: 16,
            ...cardShadow,
          }}
        >
          <Text style={[typography.h2, { color: colors.navyBlue }]}>
            Subject Analytics
          </Text>
          <Text style={[typography.caption, { color: colors.steelGray, marginTop: 4 }]}>
            Performance metrics across curriculum pillars
          </Text>

          {/* Toggle pill */}
          {hasAiScores && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: colors.cream,
                borderRadius: 20,
                padding: 4,
                alignSelf: "flex-start",
                marginTop: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setActiveTab("marks");
                  setTooltipSubject(null);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  backgroundColor: activeTab === "marks" ? colors.navyBlue : "transparent",
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                    color: activeTab === "marks" ? colors.white : colors.steelGray,
                  }}
                >
                  Exam Marks
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setActiveTab("score");
                  setTooltipSubject(null);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  backgroundColor: activeTab === "score" ? colors.navyBlue : "transparent",
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                    color: activeTab === "score" ? colors.white : colors.steelGray,
                  }}
                >
                  AI Score
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bar Chart */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16 }}
            contentContainerStyle={{
              paddingTop: 36, // leave room for tooltip overlay
              paddingBottom: 8,
              alignItems: "flex-end",
            }}
          >
            {loadingAnalytics ? (
              <ActivityIndicator size="small" color={colors.navyBlue} style={{ flex: 1, alignSelf: "center", width: 100 }} />
            ) : chartData.length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", width: 200, paddingVertical: 20 }}>
                <Ionicons name="bar-chart-outline" size={32} color={colors.steelGray} style={{ marginBottom: 8 }} />
                <Text style={[typography.caption, { color: colors.steelGray, fontStyle: "italic" }]}>
                  No analytics data available.
                </Text>
              </View>
            ) : (
              chartData.map((sub, index) => {
                const isSelected = tooltipSubject === sub.id;
                const value = activeTab === "marks" ? sub.avgMarks : (sub.avgScore ?? 0);
                const maxValue = activeTab === "marks" ? 100 : 10;
                const barHeight = Math.max(8, Math.min(120, (value / maxValue) * 120));
                const barColor = activeTab === "marks" ? colors.navyBlue : colors.royalBlue;

                return (
                  <View key={`${sub.id}-${index}`} style={{ width: 44, marginHorizontal: 8, alignItems: "center", position: "relative" }}>
                    {/* Tooltip Overlay */}
                    {isSelected && (
                      <View
                        style={{
                          position: "absolute",
                          top: -36,
                          backgroundColor: colors.navyBlue,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          zIndex: 50,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Text style={{ color: colors.white, fontSize: 10, fontFamily: "Poppins_600SemiBold" }}>
                          {activeTab === "marks" ? `${value}%` : `${value}/10.0`}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setTooltipSubject(isSelected ? null : sub.id)}
                      style={{
                        width: 44,
                        height: 120,
                        justifyContent: "flex-end",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: barHeight,
                          backgroundColor: barColor,
                          borderTopLeftRadius: 6,
                          borderTopRightRadius: 6,
                          opacity: isSelected ? 1.0 : 0.85,
                        }}
                      />
                    </TouchableOpacity>

                    <Text 
                      numberOfLines={1}
                      style={[
                        typography.caption, 
                        { 
                          color: colors.steelGray, 
                          marginTop: 6, 
                          textAlign: "center",
                          width: 44,
                          fontSize: 10,
                          fontFamily: "Inter_500Medium",
                        }
                      ]}
                    >
                      {getSubjectAbbreviation(sub.subject)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer Caption */}
          <Text
            style={[
              typography.caption,
              {
                color: colors.steelGray,
                textAlign: "center",
                marginTop: 14,
                letterSpacing: 0.5,
                fontSize: 11,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            TAP BARS FOR DETAILED MODULE ANALYSIS
          </Text>
        </View>

        {/* F. Departmental Breakdown */}
        <View style={{ marginTop: 24, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={[typography.h2, { color: colors.navyBlue, marginBottom: 12 }]}>
            {`Departmental Breakdown (${selectedClass})`}
          </Text>

          {loadingAnalytics ? (
            <ActivityIndicator size="small" color={colors.navyBlue} style={{ marginVertical: 30 }} />
          ) : !subjectAnalytics || subjectAnalytics.length === 0 ? (
            <View 
              style={{ 
                alignItems: "center", 
                justifyContent: "center", 
                paddingVertical: 40, 
                paddingHorizontal: 20,
                backgroundColor: colors.white,
                borderRadius: cardBorderRadius,
                borderWidth: 1,
                borderColor: colors.lightGray,
                marginTop: 8
              }}
            >
              <Ionicons name="book-outline" size={36} color={colors.steelGray} style={{ marginBottom: 12 }} />
              <Text style={[typography.h4, { color: colors.navyBlue, fontWeight: "600", textAlign: "center", marginBottom: 4 }]}>
                No subjects assigned
              </Text>
              <Text style={[typography.caption, { color: colors.steelGray, textAlign: "center", maxWidth: "80%" }]}>
                This class has no subjects or academic results logged.
              </Text>
            </View>
          ) : (
            subjectAnalytics.map((sub, index) => {
              const difficulty = getDifficulty(sub.avgMarks);
              const diffColors = {
                LOW: { bg: colors.successBg, text: colors.success },
                MEDIUM: { bg: colors.warningBg, text: colors.warning },
                HIGH: { bg: colors.dangerBg, text: colors.danger },
              }[difficulty];

              const parsedImprov = parseFloat(sub.improvementPercent.replace("%", ""));
              const isZeroImprov = isNaN(parsedImprov) || parsedImprov === 0;
              const isImprovPositive = !sub.improvementPercent.startsWith("-");
              const improvBg = isZeroImprov ? colors.lightGray : (isImprovPositive ? colors.successBg : colors.dangerBg);
              const improvColor = isZeroImprov ? colors.steelGray : (isImprovPositive ? colors.success : colors.danger);
              const improvArrow = isZeroImprov ? "" : (isImprovPositive ? "▲ " : "▼ ");

              return (
                <View
                  key={`${sub.id}-${index}`}
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: cardBorderRadius,
                    borderWidth: 1,
                    borderColor: colors.lightGray,
                    padding: 16,
                    ...cardShadow,
                    marginBottom: 12,
                  }}
                >
                  {/* Top row */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 28 }}>
                        {getSubjectEmoji(sub.subject)}
                      </Text>
                      <View>
                        <Text style={[typography.h4, { color: colors.navyBlue }]}>
                          {sub.subject}
                        </Text>
                        <Text style={[typography.caption, { color: colors.steelGray }]}>
                          {sub.topic}
                        </Text>
                      </View>
                    </View>

                    {/* Difficulty Badge */}
                    <View
                      style={{
                        backgroundColor: diffColors.bg,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={[typography.caption, { color: diffColors.text, fontWeight: "bold" }]}>
                        {difficulty}
                      </Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={{ height: 1, backgroundColor: colors.lightGray, marginVertical: 12 }} />

                  {/* Metrics row */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.steelGray, marginBottom: 4 }]}>
                        Exam Marks
                      </Text>
                      <Text style={[typography.h3, { color: colors.navyBlue }]}>
                        {sub.avgMarks !== 0 ? `${sub.avgMarks}/100` : "—"}
                      </Text>
                    </View>

                    <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 16, alignSelf: "stretch" }} />

                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.steelGray, marginBottom: 4 }]}>
                        AI Homework Score
                      </Text>
                      <Text style={[typography.h3, { color: colors.gold }]}>
                        {sub.avgScore !== null && sub.avgScore !== undefined ? `${sub.avgScore}/10` : "—"}
                      </Text>
                    </View>
                  </View>

                  {/* Footer row */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8, flexWrap: "wrap" }}>
                    {/* Improvement chip */}
                    <View
                      style={{
                        backgroundColor: improvBg,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={[typography.caption, { color: improvColor, fontWeight: "bold" }]}>
                        {improvArrow}{sub.improvementPercent.replace(/[+-]/g, "")}
                      </Text>
                    </View>

                    {/* Top student chip */}
                    <View
                      style={{
                        backgroundColor: colors.cream,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={[typography.caption, { color: colors.charcoal }]}>
                        🏆 Top: {sub.topPerformer === "N/A" ? "—" : sub.topPerformer}
                      </Text>
                    </View>

                    {/* Support chip */}
                    {sub.needsSupportCount > 0 && (
                      <View
                        style={{
                          backgroundColor: colors.dangerBg,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={[typography.caption, { color: colors.danger, fontWeight: "bold" }]}>
                          ⚠️ {sub.needsSupportCount} need support
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      <BottomNavBar activeTab="academics" />

      {/* Dropdown Modal */}
      <Modal
        visible={isDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsDropdownOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxHeight: "60%",
              backgroundColor: colors.white,
              borderRadius: cardBorderRadius,
              borderWidth: 1,
              borderColor: colors.lightGray,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <Text style={[typography.h3, { color: colors.navyBlue, marginBottom: 16, textAlign: "center" }]}>
              Select Class & Section
            </Text>
            
            <FlatList
              data={gradeNames}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedClass === item;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedClass(item);
                      setTooltipSubject(null);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: isSelected ? colors.cream : "transparent",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={[
                        typography.bodyMd,
                        {
                          color: isSelected ? colors.navyBlue : colors.charcoal,
                          fontFamily: isSelected ? "Poppins_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.navyBlue} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              onPress={() => setIsDropdownOpen(false)}
              style={{
                marginTop: 16,
                backgroundColor: colors.navyBlue,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={[typography.bodyMd, { color: colors.white, fontFamily: "Poppins_600SemiBold" }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

