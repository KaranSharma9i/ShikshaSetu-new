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
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";
import { generateHomework } from "@/src/repositories/teacherRepository";
import { Colors, Shadow } from "@/constants/theme";

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
  const { userId, institutionId, isLoaded, isSignedIn, theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#ffe088";
  const creamColor = theme?.colors?.cream ?? "#F7F3EB";

  // Loading States
  const [loading, setLoading] = useState(true);
  const [dailyLimitLoading, setDailyLimitLoading] = useState(false);
  const [preparingOverlay, setPreparingOverlay] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [dueDateDays, setDueDateDays] = useState<number>(7);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [isDueDropdownOpen, setIsDueDropdownOpen] = useState(false);

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

  interface SectionItem {
    id: string;
    name: string;
  }

  // Warning Constraints
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [sectionAlreadyUsedToday, setSectionAlreadyUsedToday] = useState(false);

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
        .select("id, user_id, institution_id")
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

      // Fetch active academic year
      const { data: ayData, error: ayErr } = await supabase
        .from("academic_years")
        .select("id")
        .eq("institution_id", teacherData.institution_id)
        .eq("is_current", true)
        .maybeSingle();

      if (ayErr) {
        console.error("Error fetching academic year:", ayErr);
      }
      if (ayData) {
        setAcademicYearId(ayData.id);
      }

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

  // Enforce daily homework limit constraint per section
  const checkDailyLimit = async (sectionId: string) => {
    if (!teacher) return;
    setDailyLimitLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

      const { count, error } = await supabase
        .from("homework")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacher.id)
        .eq("section_id", sectionId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (error) {
        console.error("Error checking daily homework limit:", error);
      }

      setSectionAlreadyUsedToday((count || 0) > 0);
    } catch (err) {
      console.error("Error in checkDailyLimit:", err);
    } finally {
      setDailyLimitLoading(false);
    }
  };

  const handleGradeSelect = async (grade: GradeItem) => {
    setSelectedGrade(grade);
    setIsDropdownOpen(false);
    setSelectedSection(null);
    setSelectedSubject(null);
    setSubjects([]);
    setSectionAlreadyUsedToday(false);

    // Fetch sections taught by this teacher for this grade
    if (teacher) {
      try {
        const { data: classSubjectsData, error } = await supabase
          .from("class_subjects")
          .select(`
            section:sections (
              id,
              name,
              class_id
            )
          `)
          .or(`teacher_id.eq.${teacher.id},teacher_id.eq.${teacher.user_id}`);

        if (error) throw error;

        const sectionsMap = new Map<string, string>();
        classSubjectsData?.forEach((row: any) => {
          const sect = Array.isArray(row.section) ? row.section[0] : row.section;
          if (sect?.class_id === grade.id) {
            sectionsMap.set(sect.id, sect.name);
          }
        });

        const uniqueSections = Array.from(sectionsMap.entries()).map(([id, name]) => ({
          id,
          name,
        })).sort((a, b) => a.name.localeCompare(b.name));

        setSections(uniqueSections);
      } catch (err) {
        console.error("Error loading sections for grade:", err);
      }
    }
  };

  const handleSectionSelect = async (section: SectionItem) => {
    setSelectedSection(section);
    setIsSectionDropdownOpen(false);
    setSelectedSubject(null);
    setSectionAlreadyUsedToday(false);

    // Immediately run query to check daily limit for section
    await checkDailyLimit(section.id);

    // Fetch subjects taught by this teacher for this section
    if (teacher) {
      try {
        const { data: classSubjectsData, error } = await supabase
          .from("class_subjects")
          .select(`
            subject:subjects (
              id,
              name
            )
          `)
          .eq("section_id", section.id)
          .or(`teacher_id.eq.${teacher.id},teacher_id.eq.${teacher.user_id}`);

        if (error) throw error;

        const subjectsMap = new Map<string, string>();
        classSubjectsData?.forEach((row: any) => {
          const sub = Array.isArray(row.subject) ? row.subject[0] : row.subject;
          if (sub) {
            subjectsMap.set(sub.id, sub.name);
          }
        });

        const uniqueSubjects = Array.from(subjectsMap.entries()).map(([id, name]) => ({
          id,
          name,
        })).sort((a, b) => a.name.localeCompare(b.name));

        setSubjects(uniqueSubjects);
      } catch (err) {
        console.error("Error loading subjects for section:", err);
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

  const questionConfig = {
    mcq: mcqCount,
    very_short: veryShortCount,
    short: shortCount,
    long: longCount,
    case_study: caseStudyCount,
    assertion_reason: assertionReasonCount,
  };

  // Form Valuations & Total Questions
  const totalQuestions = Object.values(questionConfig).reduce(
    (sum, val) => sum + val,
    0
  );

  const isFormValid =
    selectedGrade !== null &&
    selectedSection !== null &&
    !sectionAlreadyUsedToday &&
    selectedSubject !== null &&
    title.trim() !== "" &&
    topicDescription.trim() !== "" &&
    totalQuestions > 0 &&
    !dailyLimitLoading;

  const validateForm = (): string | null => {
    if (!selectedGrade) return "Please select a grade";
    if (!selectedSection) return "Please select a section";
    if (!selectedSubject) return "Please select a subject";
    if (!title.trim()) return "Please enter a title";
    if (!topicDescription.trim()) return "Please enter a topic description";
    if (totalQuestions === 0) return "Please add at least one question";
    return null;
  };

  const handleGenerate = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert("Missing Information", validationError);
      return;
    }

    if (!teacher) {
      Alert.alert("Error", "Teacher profile not loaded yet. Please wait.");
      return;
    }

    const instId = teacher.institution_id || institutionId;
    if (!instId) {
      Alert.alert("Error", "Institution ID not found.");
      return;
    }

    if (!academicYearId) {
      Alert.alert("Error", "Active academic year not found.");
      return;
    }

    setIsGenerating(true);

    try {
      const computedDueDate = new Date(
        Date.now() + dueDateDays * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0]; // YYYY-MM-DD format

      const result = await generateHomework({
        grade: selectedGrade!.name,
        subject: selectedSubject!.name,
        title: title.trim(),
        topic_description: topicDescription.trim(),
        question_config: questionConfig,
        teacher_id: teacher.id,
        class_id: selectedGrade!.id,
        section_id: selectedSection!.id,
        section_name: selectedSection!.name,
        subject_id: selectedSubject!.id,
        institution_id: instId,
        academic_year_id: academicYearId,
        due_date: computedDueDate,
        difficulty: difficulty,
      });

      router.push({
        pathname: "/(teacher)/teacher-homework/preview" as any,
        params: {
          homework_id: result.homework_id,
          generated_content: JSON.stringify(result.generated_content),
          pdf_url: result.pdf_url ?? "",
          grade: `${selectedGrade!.name} - ${selectedSection!.name}`,
          subject: selectedSubject!.name,
          title: title.trim(),
          due_date: computedDueDate,
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Generation Failed",
        error.message ?? "Something went wrong. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="Create Homework" showBack={true} onBack={() => router.back()} />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={secondaryColor} />
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
              <Text className="font-poppins-semibold text-base mb-1.5" style={{ color: primaryColor }}>
                Select Grade
              </Text>
              {dailyLimitLoading && (
                <ActivityIndicator size="small" color={secondaryColor} />
              )}
            </View>

            <TouchableOpacity
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              activeOpacity={0.8}
              className={`w-full bg-white flex-row justify-between items-center px-4 py-3 border ${
                isDropdownOpen ? "rounded-t-lg border-b-0" : "rounded-lg"
              }`}
              style={{ borderColor: primaryColor }}
            >
              <Text
                className={
                  selectedGrade
                    ? "font-inter text-sm"
                    : "text-gray-400 font-inter text-sm"
                }
                style={selectedGrade ? { color: primaryColor } : undefined}
              >
                {selectedGrade ? selectedGrade.name : "Select Grade"}
              </Text>
              <Feather
                name="chevron-down"
                size={18}
                color={isDropdownOpen ? secondaryColor : primaryColor}
              />
            </TouchableOpacity>

            {/* Dropdown Options List */}
            {isDropdownOpen && (
              <View 
                className="w-full bg-white border rounded-b-lg overflow-hidden z-40 max-h-48 shadow-sm"
                style={{ borderColor: primaryColor }}
              >
                <ScrollView nestedScrollEnabled>
                  {grades.map((grade) => (
                    <TouchableOpacity
                      key={grade.id}
                      onPress={() => handleGradeSelect(grade)}
                      className="px-4 py-3.5 border-b border-gray-100 last:border-b-0"
                    >
                      <Text className="font-inter text-sm" style={{ color: primaryColor }}>
                        {grade.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

          </View>

          {/* Select Section Dropdown */}
          {selectedGrade && (
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="font-poppins-semibold text-base mb-1.5" style={{ color: primaryColor }}>
                  Select Section
                </Text>
                {dailyLimitLoading && (
                  <ActivityIndicator size="small" color={secondaryColor} />
                )}
              </View>

              <TouchableOpacity
                onPress={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                activeOpacity={0.8}
                className={`w-full bg-white flex-row justify-between items-center px-4 py-3 border ${
                  isSectionDropdownOpen ? "rounded-t-lg border-b-0" : "rounded-lg"
                }`}
                style={{ borderColor: primaryColor }}
              >
                <Text
                  className={
                    selectedSection
                      ? "font-inter text-sm"
                      : "text-gray-400 font-inter text-sm"
                  }
                  style={selectedSection ? { color: primaryColor } : undefined}
                >
                  {selectedSection ? selectedSection.name : "Select Section"}
                </Text>
                <Feather
                  name="chevron-down"
                  size={18}
                  color={isSectionDropdownOpen ? secondaryColor : primaryColor}
                />
              </TouchableOpacity>

              {/* Dropdown Options List */}
              {isSectionDropdownOpen && (
                <View 
                  className="w-full bg-white border rounded-b-lg overflow-hidden z-40 max-h-48 shadow-sm"
                  style={{ borderColor: primaryColor }}
                >
                  <ScrollView nestedScrollEnabled>
                    {sections.map((section) => (
                      <TouchableOpacity
                        key={section.id}
                        onPress={() => handleSectionSelect(section)}
                        className="px-4 py-3.5 border-b border-gray-100 last:border-b-0"
                      >
                        <Text className="font-inter text-sm" style={{ color: primaryColor }}>
                          {section.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Daily limit Warning Banner */}
              {sectionAlreadyUsedToday && selectedSection && (
                <View className="bg-[#FFF3CD] border border-[#FFEBAA] rounded-lg p-3 flex-row items-start mt-2">
                  <Ionicons
                    name="warning"
                    size={18}
                    color="#856404"
                    className="mt-0.5 mr-2"
                  />
                  <Text className="font-inter text-[13px] text-[#856404] flex-1 leading-relaxed">
                    You've already assigned homework to Section {selectedSection.name} today. Try
                    again tomorrow or select a different section.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* STEP 1: Select Subject */}
          <View className="mb-6 mt-2">
            <Text className="font-poppins-semibold text-base mb-3" style={{ color: primaryColor }}>
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
                      className="w-[48%] bg-white rounded-xl p-3.5 m-[1%] border relative"
                      style={
                        isSelected
                          ? { borderColor: secondaryColor, backgroundColor: secondaryLightColor, borderWidth: 2 }
                          : { borderColor: "#E4E2E1", borderWidth: 1 }
                      }
                    >
                      {/* Subject Icon Box */}
                      <View className="w-10 h-10 rounded-lg items-center justify-center mb-3" style={{ backgroundColor: primaryColor }}>
                        <Feather name={icon} size={18} color={secondaryColor} />
                      </View>

                      {/* Info */}
                      <Text
                        className="font-poppins-semibold text-[14px]"
                        style={{ color: primaryColor }}
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
                        <View className="absolute top-2 right-2 w-4 h-4 rounded-full items-center justify-center" style={{ backgroundColor: secondaryColor }}>
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
            <Text className="font-poppins-semibold text-base mb-3" style={{ color: primaryColor }}>
              Step 2: Title & Topic
            </Text>

            {/* Title Input */}
            <View className="mb-4">
              <Text className="font-open-sans font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-1.5">
                TITLE
              </Text>
              <TextInput
                className="bg-white border border-[#6B7280] rounded-lg px-3.5 py-3 font-inter text-sm"
                style={{ color: primaryColor }}
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
                className="bg-white border border-[#6B7280] rounded-lg px-3.5 py-3 font-inter text-sm"
                placeholder="Add specific instructions or focus areas for this assignment..."
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: "top", color: primaryColor }}
                value={topicDescription}
                onChangeText={setTopicDescription}
              />
            </View>
          </View>

          {/* STEP 3: Assignment Settings */}
          <View className="mb-6">
            <Text className="font-poppins-semibold text-base mb-3" style={{ color: primaryColor }}>
              Step 3: Assignment Settings
            </Text>

            {/* Due Date Dropdown Selector */}
            <View className="mb-4">
              <Text className="font-open-sans font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-1.5">
                DUE DATE
              </Text>
              <TouchableOpacity
                onPress={() => setIsDueDropdownOpen(!isDueDropdownOpen)}
                activeOpacity={0.8}
                className="w-full bg-white flex-row justify-between items-center px-4 py-3 border"
                style={{
                  borderColor: primaryColor,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderBottomLeftRadius: isDueDropdownOpen ? 0 : 8,
                  borderBottomRightRadius: isDueDropdownOpen ? 0 : 8,
                  borderBottomWidth: isDueDropdownOpen ? 0 : 1,
                }}
              >
                <Text className="font-inter text-sm" style={{ color: primaryColor }}>
                  {dueDateDays} {dueDateDays === 1 ? "day" : "days"}
                </Text>
                <Feather
                  name="chevron-down"
                  size={18}
                  color={isDueDropdownOpen ? secondaryColor : primaryColor}
                />
              </TouchableOpacity>

              {/* Due Date Options List */}
              {isDueDropdownOpen && (
                <View 
                  className="w-full bg-white border max-h-48 z-40"
                  style={{
                    borderColor: primaryColor,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    overflow: "hidden",
                    ...Shadow.sm,
                  }}
                >
                  <ScrollView nestedScrollEnabled>
                    {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                      <TouchableOpacity
                        key={days}
                        onPress={() => {
                          setDueDateDays(days);
                          setIsDueDropdownOpen(false);
                        }}
                        className="px-4 py-3.5 border-b border-gray-100 last:border-b-0"
                      >
                        <Text className="font-inter text-sm" style={{ color: primaryColor }}>
                          {days} {days === 1 ? "day" : "days"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Difficulty Chips */}
            <View className="mb-4">
              <Text className="font-open-sans font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-1.5">
                DIFFICULTY
              </Text>
              
              <View className="flex-row -mx-1 items-center mt-1">
                {(['Easy', 'Medium', 'Hard'] as const).map((level) => {
                  const isSelected = difficulty === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setDifficulty(level)}
                      activeOpacity={0.8}
                      className="flex-1 items-center justify-center py-2.5 mx-1 border rounded-lg"
                      style={
                        isSelected
                          ? {
                              backgroundColor: primaryColor,
                              borderColor: primaryColor,
                              ...Shadow.md,
                            }
                          : {
                              backgroundColor: 'transparent',
                              borderColor: Colors.border,
                            }
                      }
                    >
                      <Text
                        className="font-inter-semibold text-sm"
                        style={{
                          color: isSelected ? '#FFFFFF' : '#6B7280',
                        }}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* STEP 4: Question Configuration */}
          <View className="mb-8">
            <Text className="font-poppins-semibold text-base mb-3" style={{ color: primaryColor }}>
              Step 4: Question Configuration
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
                    <Text className="font-inter-medium text-[14px]" style={{ color: primaryColor }}>
                      {row.label}
                    </Text>

                    {/* Stepper controls */}
                    <View className="flex-row items-center space-x-3">
                      {/* Decrement Button */}
                      <TouchableOpacity
                        disabled={row.val <= 0}
                        onPress={() => row.setVal(row.val - 1)}
                        activeOpacity={0.7}
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={{ backgroundColor: row.val <= 0 ? "rgba(243, 244, 246, 1)" : primaryColor }}
                      >
                        <Feather
                          name="minus"
                          size={14}
                          color={row.val <= 0 ? "#9CA3AF" : secondaryColor}
                        />
                      </TouchableOpacity>

                      {/* Value Count */}
                      <View style={{ minWidth: 32 }} className="items-center">
                        <Text className="font-poppins-bold text-[16px]" style={{ color: primaryColor }}>
                          {row.val}
                        </Text>
                      </View>

                      {/* Increment Button */}
                      <TouchableOpacity
                        onPress={() => row.setVal(row.val + 1)}
                        activeOpacity={0.7}
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Feather name="plus" size={14} color={secondaryColor} />
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
            style={[
              styles.generateButton,
              { backgroundColor: primaryColor },
              (isGenerating || !isFormValid) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={isGenerating || !isFormValid}
            activeOpacity={0.85}
          >
            {isGenerating ? (
              <View style={styles.generateButtonContent}>
                <ActivityIndicator size="small" color={secondaryColor} />
                <Text style={[styles.generateButtonText, { color: secondaryColor }]}>Generating...</Text>
              </View>
            ) : (
              <View style={styles.generateButtonContent}>
                <Text style={[styles.generateButtonText, { color: secondaryColor }]}>Generate Questions →</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Loading Overlay Modal */}
      <Modal visible={preparingOverlay} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: primaryColor }}>
          <ActivityIndicator size="large" color={secondaryColor} />
          <Text className="font-poppins text-[16px] text-white mt-4 text-center">
            Preparing assignment...
          </Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  generateButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
  },
});
