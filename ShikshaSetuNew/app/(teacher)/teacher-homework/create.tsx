import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";

interface GradeItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

export default function CreateHomework() {
  const router = useRouter();
  const { userId, isLoaded, isSignedIn } = useAuth();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [dailyLimitLoading, setDailyLimitLoading] = useState(false);
  const [preparingOverlay, setPreparingOverlay] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);

  // Form Fields
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);

  const [title, setTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");

  // Steppers State
  const [mcqCount, setMcqCount] = useState(0);
  const [veryShortCount, setVeryShortCount] = useState(0);
  const [shortCount, setShortCount] = useState(0);
  const [longCount, setLongCount] = useState(0);
  const [caseStudyCount, setCaseStudyCount] = useState(0);
  const [assertionReasonCount, setAssertionReasonCount] = useState(0);

  // Warning Constraints
  const [gradeAlreadyUsedToday, setGradeAlreadyUsedToday] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      loadTeacherAndGrades();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadTeacherAndGrades = async () => {
    try {
      setLoading(true);

      // 1. Fetch teacher record using auth userId
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error fetching teacher profile:", teacherErr);
        setLoading(false);
        return;
      }

      setTeacher(teacherData);
      const teacherId = teacherData.id;
      const teacherUserId = teacherData.user_id;

      // 2. Fetch distinct grades/classes taught by this teacher
      // Join class_subjects -> sections -> classes
      const { data: classSubjectsData, error: classSubjectsErr } = await supabase
        .from("class_subjects")
        .select(`
          section:sections (
            class:classes (
              id,
              name
            )
          )
        `)
        .or(`teacher_id.eq.${teacherId},teacher_id.eq.${teacherUserId}`);

      if (classSubjectsErr) {
        console.error("Error fetching class subjects:", classSubjectsErr);
        setLoading(false);
        return;
      }

      const gradesMap = new Map<string, string>();
      classSubjectsData?.forEach((row: any) => {
        const sect = Array.isArray(row.section) ? row.section[0] : row.section;
        const cls = sect?.class ? (Array.isArray(sect.class) ? sect.class[0] : sect.class) : null;
        if (cls) {
          gradesMap.set(cls.id, cls.name);
        }
      });

      const uniqueGrades: GradeItem[] = Array.from(gradesMap.entries()).map(([id, name]) => ({
        id,
        name,
      }));

      setGrades(uniqueGrades);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load setup data:", err);
      setLoading(false);
    }
  };

  // Enforce daily homework limit constraint
  const checkDailyLimit = async (gradeId: string) => {
    if (!teacher) return;
    setDailyLimitLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

      const { count, error } = await supabase
        .from("homework")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacher.id)
        .eq("class_id", gradeId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (error) {
        console.error("Error checking daily homework limit:", error);
      }

      setGradeAlreadyUsedToday((count || 0) > 0);
    } catch (err) {
      console.error("Error in checkDailyLimit:", err);
    } finally {
      setDailyLimitLoading(false);
    }
  };

  const handleGradeSelect = async (grade: GradeItem) => {
    setSelectedGrade(grade);
    setIsDropdownOpen(false);
    setSelectedSubject(null);
    setGradeAlreadyUsedToday(false);

    // Immediately run query to check daily limit
    await checkDailyLimit(grade.id);

    // Fetch subjects taught by this teacher for this grade
    if (teacher) {
      try {
        const { data: classSubjectsData, error } = await supabase
          .from("class_subjects")
          .select(`
            subject:subjects (
              id,
              name
            ),
            section:sections (
              class_id
            )
          `)
          .or(`teacher_id.eq.${teacher.id},teacher_id.eq.${teacher.user_id}`);

        if (error) throw error;

        const subjectsMap = new Map<string, string>();
        classSubjectsData?.forEach((row: any) => {
          const sect = Array.isArray(row.section) ? row.section[0] : row.section;
          const sub = Array.isArray(row.subject) ? row.subject[0] : row.subject;
          if (sect?.class_id === grade.id && sub) {
            subjectsMap.set(sub.id, sub.name);
          }
        });

        const uniqueSubjects = Array.from(subjectsMap.entries()).map(([id, name]) => ({
          id,
          name,
        }));
        setSubjects(uniqueSubjects);
      } catch (err) {
        console.error("Error loading subjects for grade:", err);
      }
    }
  };

  // Static content details matching descriptions
  const getSubjectDescription = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("math")) return "Algebra, Geometry & Calculus";
    if (lower.includes("physic")) return "Mechanics, Heat & Waves";
    if (lower.includes("chemist")) return "Elements, Atoms & Reactions";
    if (lower.includes("biolog")) return "Life, Genetics & Anatomy";
    if (lower.includes("english")) return "Grammar, Reading & Writing";
    if (lower.includes("history")) return "World History & Civics";
    return "Lesson Assignment & Focus";
  };

  const getSubjectIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("math")) return "triangle" as const;
    if (lower.includes("physic")) return "zap" as const;
    if (lower.includes("chemist")) return "droplet" as const;
    if (lower.includes("biolog")) return "heart" as const;
    if (lower.includes("english")) return "book-open" as const;
    if (lower.includes("history")) return "clock" as const;
    return "book" as const;
  };

  // Form Valuations & Total Questions
  const totalQuestions =
    mcqCount +
    veryShortCount +
    shortCount +
    longCount +
    caseStudyCount +
    assertionReasonCount;

  const isFormValid =
    selectedGrade !== null &&
    !gradeAlreadyUsedToday &&
    selectedSubject !== null &&
    title.trim() !== "" &&
    totalQuestions > 0 &&
    !dailyLimitLoading;

  const handleGenerateQuestions = () => {
    if (!isFormValid || !selectedGrade || !selectedSubject) return;

    // Show brief loading overlay for 500ms
    setPreparingOverlay(true);

    setTimeout(() => {
      setPreparingOverlay(false);
      
      const formattedDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

      router.push({
        pathname: "/(teacher)/teacher-homework/published" as any,
        params: {
          subject: selectedSubject.name,
          grade: selectedGrade.name,
          chapter: title, // title serves as chapter param
          questionCount: totalQuestions.toString(),
          studentCount: "42",
          dueDate: formattedDueDate,
        },
      });
    }, 500);
  };

  return (
    <View className="flex-1 bg-[#F7F3EB]">
      <Header title="Create Homework" showBack={true} onBack={() => router.back()} />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text className="font-poppins-semibold text-xs text-gray-400 mt-2">
            Loading form details...
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dropdown Header & Trigger */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="font-poppins-semibold text-base text-[#0D1B2A]">
                Select Grade
              </Text>
              {dailyLimitLoading && (
                <ActivityIndicator size="small" color="#D4AF37" />
              )}
            </View>

            <TouchableOpacity
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              activeOpacity={0.8}
              className={`w-full bg-white flex-row justify-between items-center px-4 py-3 border border-[#0D1B2A] ${
                isDropdownOpen ? "rounded-t-lg border-b-0" : "rounded-lg"
              }`}
            >
              <Text
                className={
                  selectedGrade
                    ? "text-[#0D1B2A] font-inter text-sm"
                    : "text-gray-400 font-inter text-sm"
                }
              >
                {selectedGrade ? selectedGrade.name : "Select Grade"}
              </Text>
              <Feather
                name="chevron-down"
                size={18}
                color={isDropdownOpen ? "#D4AF37" : "#0D1B2A"}
              />
            </TouchableOpacity>

            {/* Dropdown Options List */}
            {isDropdownOpen && (
              <View className="w-full bg-white border border-[#0D1B2A] rounded-b-lg overflow-hidden z-40 max-h-48 shadow-sm">
                <ScrollView nestedScrollEnabled>
                  {grades.map((grade) => (
                    <TouchableOpacity
                      key={grade.id}
                      onPress={() => handleGradeSelect(grade)}
                      className="px-4 py-3.5 border-b border-gray-100 last:border-b-0"
                    >
                      <Text className="text-[#0D1B2A] font-inter text-sm">
                        {grade.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Daily limit Warning Banner */}
            {gradeAlreadyUsedToday && selectedGrade && (
              <View className="bg-[#FFF3CD] border border-[#FFEBAA] rounded-lg p-3 flex-row items-start mt-2">
                <Ionicons
                  name="warning"
                  size={18}
                  color="#856404"
                  className="mt-0.5 mr-2"
                />
                <Text className="font-inter text-[13px] text-[#856404] flex-1 leading-relaxed">
                  You've already assigned homework to {selectedGrade.name} today. Try
                  again tomorrow or select a different grade.
                </Text>
              </View>
            )}
          </View>

          {/* STEP 1: Select Subject */}
          <View className="mb-6 mt-2">
            <Text className="font-poppins-semibold text-base text-[#0D1B2A] mb-3">
              Step 1: Select Subject
            </Text>

            {/* Subjects Grid */}
            <View className="flex-row flex-wrap -mx-1.5">
              {subjects.length === 0 ? (
                <View className="flex-1 items-center justify-center py-6 bg-white border border-[#E4E2E1] rounded-xl mx-1.5">
                  <Feather name="book" size={24} color="#9CA3AF" />
                  <Text className="font-inter text-xs text-gray-400 mt-2">
                    {selectedGrade
                      ? "No subjects assigned for this grade."
                      : "Please select a grade to see subjects."}
                  </Text>
                </View>
              ) : (
                subjects.map((sub) => {
                  const isSelected = selectedSubject?.id === sub.id;
                  const description = getSubjectDescription(sub.name);
                  const icon = getSubjectIcon(sub.name);

                  return (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => setSelectedSubject(sub)}
                      activeOpacity={0.8}
                      className={`w-[48%] bg-white rounded-xl p-3.5 m-[1%] border relative ${
                        isSelected
                          ? "border-[#D4AF37] bg-[#FFFBEA] border-2"
                          : "border-[#E4E2E1] border-1"
                      }`}
                    >
                      {/* Subject Icon Box */}
                      <View className="w-10 h-10 rounded-lg bg-[#0D1B2A] items-center justify-center mb-3">
                        <Feather name={icon} size={18} color="#D4AF37" />
                      </View>

                      {/* Info */}
                      <Text
                        className="font-poppins-semibold text-[14px] text-[#0D1B2A]"
                        numberOfLines={1}
                      >
                        {sub.name}
                      </Text>
                      <Text
                        className="font-inter text-gray-400 text-[11px] mt-1"
                        numberOfLines={2}
                      >
                        {description}
                      </Text>

                      {/* Selected Badge */}
                      {isSelected && (
                        <View className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#D4AF37] items-center justify-center">
                          <Feather name="check" size={10} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          {/* STEP 2: Title & Topic */}
          <View className="mb-6">
            <Text className="font-poppins-semibold text-base text-[#0D1B2A] mb-3">
              Step 2: Title & Topic
            </Text>

            {/* Title Input */}
            <View className="mb-4">
              <Text className="font-open-sans font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-1.5">
                TITLE
              </Text>
              <TextInput
                className="bg-white border border-[#6B7280] rounded-lg px-3.5 py-3 font-inter text-sm text-[#0D1B2A]"
                placeholder="e.g. Algebra — Quadratic Equations"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description Textarea */}
            <View>
              <Text className="font-open-sans font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-1.5">
                TOPIC DESCRIPTION
              </Text>
              <TextInput
                className="bg-white border border-[#6B7280] rounded-lg px-3.5 py-3 font-inter text-sm text-[#0D1B2A]"
                placeholder="Add specific instructions or focus areas for this assignment..."
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: "top" }}
                value={topicDescription}
                onChangeText={setTopicDescription}
              />
            </View>
          </View>

          {/* STEP 3: Question Configuration */}
          <View className="mb-8">
            <Text className="font-poppins-semibold text-base text-[#0D1B2A] mb-3">
              Step 3: Question Configuration
            </Text>

            {/* Stepper Card */}
            <View className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm space-y-4">
              {/* Stepper Row Item Component */}
              {[
                { label: "Multiple Choice (MCQ)", val: mcqCount, setVal: setMcqCount },
                { label: "Very Short Answer", val: veryShortCount, setVal: setVeryShortCount },
                { label: "Short Answer", val: shortCount, setVal: setShortCount },
                { label: "Long Answer", val: longCount, setVal: setLongCount },
                { label: "Case Study Based", val: caseStudyCount, setVal: setCaseStudyCount },
                { label: "Assertion-Reason", val: assertionReasonCount, setVal: setAssertionReasonCount },
              ].map((row, index, arr) => (
                <View key={row.label}>
                  <View className="flex-row justify-between items-center py-2.5">
                    <Text className="font-inter-medium text-[14px] text-[#0D1B2A]">
                      {row.label}
                    </Text>

                    {/* Stepper controls */}
                    <View className="flex-row items-center space-x-3">
                      {/* Decrement Button */}
                      <TouchableOpacity
                        disabled={row.val <= 0}
                        onPress={() => row.setVal(row.val - 1)}
                        activeOpacity={0.7}
                        className={`w-7 h-7 rounded-full items-center justify-center ${
                          row.val <= 0 ? "bg-gray-100" : "bg-[#0D1B2A]"
                        }`}
                      >
                        <Feather
                          name="minus"
                          size={14}
                          color={row.val <= 0 ? "#9CA3AF" : "#D4AF37"}
                        />
                      </TouchableOpacity>

                      {/* Value Count */}
                      <View style={{ minWidth: 32 }} className="items-center">
                        <Text className="font-poppins-bold text-[16px] text-[#0D1B2A]">
                          {row.val}
                        </Text>
                      </View>

                      {/* Increment Button */}
                      <TouchableOpacity
                        onPress={() => row.setVal(row.val + 1)}
                        activeOpacity={0.7}
                        className="w-7 h-7 rounded-full bg-[#0D1B2A] items-center justify-center"
                      >
                        <Feather name="plus" size={14} color="#D4AF37" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Row divider */}
                  {index < arr.length - 1 && (
                    <View className="h-[1px] bg-[#E4E2E1] w-full" />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Action Trigger Button */}
          <TouchableOpacity
            disabled={!isFormValid}
            onPress={handleGenerateQuestions}
            activeOpacity={0.85}
            className={`w-full h-14 rounded-2xl items-center justify-center flex-row bg-[#0D1B2A] ${
              !isFormValid ? "opacity-50" : ""
            }`}
          >
            <Text className="font-poppins-semibold text-[16px] text-[#D4AF37]">
              Generate Questions →
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Loading Overlay Modal */}
      <Modal visible={preparingOverlay} transparent={true} animationType="fade">
        <View className="flex-1 bg-[#0D1B2A] justify-center items-center px-6">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text className="font-poppins text-[16px] text-white mt-4 text-center">
            Preparing assignment...
          </Text>
        </View>
      </Modal>
    </View>
  );
}
