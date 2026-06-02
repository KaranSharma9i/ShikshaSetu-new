import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/teacher/Header";
import dayjs from "dayjs";

interface ClassSectionOption {
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  label: string;
}

interface ExamOption {
  id: string;
  exam_name: string;
  exam_date: string;
  total_marks: number;
  subject_name: string;
  formatted_date: string;
}

interface StudentItem {
  id: string;
  roll_number: string | null;
  full_name: string;
}

export default function BulkMarksScreen() {
  const router = useRouter();
  const { userId, isLoaded, isSignedIn } = useAuth();

  // Screen level loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dropdown options and selections
  const [classOptions, setClassOptions] = useState<ClassSectionOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassSectionOption | null>(null);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamOption | null>(null);
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);

  // Students list and marks
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [initialMarksMap, setInitialMarksMap] = useState<Record<string, string>>({});

  // Toast banner state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | null>(null);

  // Auto-dismiss toast helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
        setToastType(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load teacher profile & classes on mount
  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      loadSetupData();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      const { data: teacherData, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("user_id", userId)
        .single();

      if (teacherErr || !teacherData) {
        console.error("Error fetching teacher:", teacherErr);
        setLoading(false);
        return;
      }

      // Fetch classes taught by this teacher
      const { data: timetableData, error: timetableErr } = await supabase
        .from("timetable")
        .select(`
          section_id,
          section:sections!inner (
            id,
            name,
            class:classes!inner (
              id,
              name
            )
          ),
          class_subjects:class_subjects!inner (
            teacher_id
          )
        `);

      if (timetableErr) {
        console.error("Error fetching timetable:", timetableErr);
        setLoading(false);
        return;
      }

      const teacherUserId = teacherData.user_id;
      const teacherRows = (timetableData || []).filter((row: any) => {
        const cs = Array.isArray(row.class_subjects)
          ? row.class_subjects[0]
          : row.class_subjects;
        return cs && cs.teacher_id === teacherUserId;
      });

      const seen = new Set();
      const mappedClasses: ClassSectionOption[] = [];
      teacherRows.forEach((row: any) => {
        if (!row.section_id || seen.has(row.section_id)) return;
        seen.add(row.section_id);

        const sec = Array.isArray(row.section) ? row.section[0] : row.section;
        const cls = sec ? (Array.isArray(sec.class) ? sec.class[0] : sec.class) : null;
        if (cls && sec) {
          mappedClasses.push({
            class_id: cls.id,
            class_name: cls.name,
            section_id: sec.id,
            section_name: sec.name,
            label: `${cls.name} - ${sec.name}`,
          });
        }
      });

      mappedClasses.sort((a, b) => {
        if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
        return a.section_name.localeCompare(b.section_name);
      });

      setClassOptions(mappedClasses);
      setLoading(false);
    } catch (err) {
      console.error("Failed loading setup data:", err);
      setLoading(false);
    }
  };

  // Load exams when class selection changes
  useEffect(() => {
    if (selectedClass) {
      loadExamsForClass(selectedClass.class_id, selectedClass.section_id);
    } else {
      setExamOptions([]);
      setSelectedExam(null);
      setStudents([]);
      setMarksMap({});
      setInitialMarksMap({});
    }
  }, [selectedClass?.section_id]);

  const loadExamsForClass = async (classId: string, sectionId: string) => {
    try {
      setSelectedExam(null);
      setStudents([]);
      setMarksMap({});
      setInitialMarksMap({});

      // Fetch subjects taught by the teacher in this specific section
      const { data: assignedSubjects, error: subjectsErr } = await supabase
        .from("class_subjects")
        .select("subject_id")
        .eq("teacher_id", userId)
        .eq("section_id", sectionId)
        .is("deleted_at", null);

      if (subjectsErr) {
        console.error("Error loading assigned subjects:", subjectsErr);
        setExamOptions([]);
        return;
      }

      const subjectIds = (assignedSubjects || []).map((s) => s.subject_id);

      if (subjectIds.length === 0) {
        setExamOptions([]);
        return;
      }

      const { data: examsData, error: examsErr } = await supabase
        .from("exams")
        .select(`
          id,
          exam_name,
          exam_date,
          total_marks,
          subject_id,
          subject:subjects!inner (
            name
          )
        `)
        .eq("class_id", classId)
        .in("subject_id", subjectIds)
        .order("exam_date", { ascending: false });

      if (examsErr) {
        console.error("Error loading exams:", examsErr);
        return;
      }

      const mappedExams: ExamOption[] = (examsData || []).map((exam: any) => {
        const sub = Array.isArray(exam.subject) ? exam.subject[0] : exam.subject;
        return {
          id: exam.id,
          exam_name: exam.exam_name,
          exam_date: exam.exam_date,
          total_marks: exam.total_marks ? Number(exam.total_marks) : 100,
          subject_name: sub?.name || "Unknown Subject",
          formatted_date: dayjs(exam.exam_date).format("MMM YYYY"),
        };
      });

      setExamOptions(mappedExams);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  // Load students and existing marks when exam is selected
  useEffect(() => {
    if (selectedClass && selectedExam) {
      loadStudentsAndMarks();
    } else {
      setStudents([]);
      setMarksMap({});
      setInitialMarksMap({});
    }
  }, [selectedClass?.section_id, selectedExam?.id]);

  const loadStudentsAndMarks = async () => {
    if (!selectedClass || !selectedExam) return;

    try {
      setLoading(true);

      // 1. Fetch active students in section
      const { data: enrollments, error: enrollmentsErr } = await supabase
        .from("enrollments")
        .select(`
          roll_number,
          student:students!inner (
            id,
            user:users!inner (
              full_name
            )
          )
        `)
        .eq("section_id", selectedClass.section_id)
        .eq("is_active", true)
        .order("roll_number", { ascending: true });

      if (enrollmentsErr) {
        console.error("Error loading enrollments:", enrollmentsErr);
        setLoading(false);
        return;
      }

      const studentsList: StudentItem[] = (enrollments || []).map((e: any) => {
        const studentObj = Array.isArray(e.student) ? e.student[0] : e.student;
        const userObj = studentObj
          ? Array.isArray(studentObj.user)
            ? studentObj.user[0]
            : studentObj.user
          : null;

        return {
          id: studentObj?.id || "",
          roll_number: e.roll_number,
          full_name: userObj?.full_name || "Unknown Student",
        };
      });

      setStudents(studentsList);

      // 2. Fetch existing marks for selected exam
      const { data: results, error: resultsErr } = await supabase
        .from("exam_results")
        .select("student_id, marks_obtained")
        .eq("exam_id", selectedExam.id);

      if (resultsErr) {
        console.error("Error loading exam results:", resultsErr);
        setLoading(false);
        return;
      }

      const loadedMarks: Record<string, string> = {};
      results?.forEach((res) => {
        if (res.marks_obtained !== null && res.marks_obtained !== undefined) {
          loadedMarks[res.student_id] = res.marks_obtained.toString();
        }
      });

      setMarksMap(loadedMarks);
      setInitialMarksMap({ ...loadedMarks });
      setLoading(false);
    } catch (err) {
      console.error("Error loading students/marks:", err);
      setLoading(false);
    }
  };

  const handleClassSelect = (cls: ClassSectionOption) => {
    setSelectedClass(cls);
    setIsClassDropdownOpen(false);
  };

  const handleExamSelect = (exam: ExamOption) => {
    setSelectedExam(exam);
    setIsExamDropdownOpen(false);
  };

  const handleMarkChange = (studentId: string, val: string) => {
    // Only allow numeric values and decimals
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;

    setMarksMap((prev) => ({
      ...prev,
      [studentId]: val,
    }));
  };

  const saveMarks = async () => {
    if (!selectedExam) return;

    // Validate inputs
    let hasError = false;
    students.forEach((s) => {
      const valStr = marksMap[s.id];
      if (valStr && valStr.trim() !== "") {
        const val = parseFloat(valStr);
        if (isNaN(val) || val < 0 || val > selectedExam.total_marks) {
          hasError = true;
        }
      }
    });

    if (hasError) {
      setToastMessage("❌ Please correct invalid marks before saving");
      setToastType("error");
      return;
    }

    try {
      setSaving(true);

      const upsertData = students
        .filter((s) => marksMap[s.id] !== undefined && marksMap[s.id].trim() !== "")
        .map((s) => ({
          exam_id: selectedExam.id,
          student_id: s.id,
          marks_obtained: parseFloat(marksMap[s.id]),
        }));

      // Find any students that had marks initially but were cleared out
      const deletedIds = students
        .filter(
          (s) =>
            initialMarksMap[s.id] !== undefined &&
            (marksMap[s.id] === undefined || marksMap[s.id].trim() === "")
        )
        .map((s) => s.id);

      // Perform upsert
      if (upsertData.length > 0) {
        const { error: upsertErr } = await supabase
          .from("exam_results")
          .upsert(upsertData, {
            onConflict: "exam_id,student_id",
          });

        if (upsertErr) throw upsertErr;
      }

      // Perform delete for cleared rows
      if (deletedIds.length > 0) {
        const { error: deleteErr } = await supabase
          .from("exam_results")
          .delete()
          .eq("exam_id", selectedExam.id)
          .in("student_id", deletedIds);

        if (deleteErr) throw deleteErr;
      }

      setToastMessage("✅ Marks saved successfully");
      setToastType("success");
      setInitialMarksMap({ ...marksMap });
      setSaving(false);
    } catch (err) {
      console.error("Failed saving marks:", err);
      setToastMessage("❌ Failed to save. Try again.");
      setToastType("error");
      setSaving(false);
    }
  };

  // Compare maps to see if differences exist
  const hasChanges = () => {
    for (const s of students) {
      const current = marksMap[s.id] || "";
      const initial = initialMarksMap[s.id] || "";
      if (current.trim() !== initial.trim()) return true;
    }
    return false;
  };

  // Validate single input
  const isInputInvalid = (studentId: string) => {
    if (!selectedExam) return false;
    const valStr = marksMap[studentId];
    if (!valStr || valStr.trim() === "") return false;
    const val = parseFloat(valStr);
    return isNaN(val) || val < 0 || val > selectedExam.total_marks;
  };

  const hasAnyValidationErrors = () => {
    let invalid = false;
    students.forEach((s) => {
      if (isInputInvalid(s.id)) invalid = true;
    });
    return invalid;
  };

  const saveDisabled = !hasChanges() || hasAnyValidationErrors() || saving;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#F7F3EB]"
    >
      <Header title="Enter Marks" showBack={true} onBack={() => router.back()} />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <View
          style={{
            position: "absolute",
            top: Platform.OS === "ios" ? 100 : 80,
            left: 16,
            right: 16,
            backgroundColor: toastType === "success" ? "#16A34A" : "#DC2626",
            padding: 14,
            borderRadius: 12,
            zIndex: 1000,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <Text
            style={{ fontFamily: "Inter-Medium" }}
            className="text-white text-sm font-semibold flex-1"
          >
            {toastMessage}
          </Text>
        </View>
      )}

      {loading && students.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text className="font-poppins-semibold text-xs text-gray-400 mt-2">
            Loading...
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: Class-Section Selector */}
          <View className="mb-4 z-50">
            <Text
              style={{ fontFamily: "Poppins-SemiBold" }}
              className="text-[15px] font-bold text-[#0D1B2A] mb-1.5"
            >
              Select Class
            </Text>

            <TouchableOpacity
              onPress={() => {
                setIsClassDropdownOpen(!isClassDropdownOpen);
                setIsExamDropdownOpen(false);
              }}
              activeOpacity={0.8}
              className={`w-full bg-white flex-row justify-between items-center px-4 py-3 border border-[#E4E2E1] ${
                isClassDropdownOpen ? "rounded-t-lg" : "rounded-lg"
              }`}
            >
              <Text
                className={
                  selectedClass
                    ? "text-[#0D1B2A] font-inter text-sm font-medium"
                    : "text-gray-400 font-inter text-sm"
                }
              >
                {selectedClass ? selectedClass.label : "Select Class"}
              </Text>
              <Feather
                name="chevron-down"
                size={18}
                color={isClassDropdownOpen ? "#D4AF37" : "#0D1B2A"}
              />
            </TouchableOpacity>

            {/* Dropdown Options List */}
            {isClassDropdownOpen && (
              <View className="w-full bg-white border-x border-b border-[#E4E2E1] rounded-b-lg overflow-hidden shadow-sm max-h-48">
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {classOptions.map((cls) => (
                    <TouchableOpacity
                      key={cls.section_id}
                      onPress={() => handleClassSelect(cls)}
                      className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <Text className="text-[#0D1B2A] font-inter text-sm font-medium">
                        {cls.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* STEP 2: Exam Selector */}
          {selectedClass && (
            <View className="mb-4 z-40">
              <Text
                style={{ fontFamily: "Poppins-SemiBold" }}
                className="text-[15px] font-bold text-[#0D1B2A] mb-1.5"
              >
                Select Exam
              </Text>

              {examOptions.length === 0 ? (
                <Text
                  style={{ fontFamily: "Inter-Regular" }}
                  className="text-gray-500 text-[13px] mt-1 italic"
                >
                  No exams found for your subjects in this class
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setIsExamDropdownOpen(!isExamDropdownOpen);
                      setIsClassDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                    className={`w-full bg-white flex-row justify-between items-center px-4 py-3 border border-[#E4E2E1] ${
                      isExamDropdownOpen ? "rounded-t-lg" : "rounded-lg"
                    }`}
                  >
                    <Text
                      className={
                        selectedExam
                          ? "text-[#0D1B2A] font-inter text-sm font-medium"
                          : "text-gray-400 font-inter text-sm"
                      }
                      numberOfLines={1}
                    >
                      {selectedExam
                        ? `${selectedExam.exam_name} — ${selectedExam.subject_name} (${selectedExam.formatted_date})`
                        : "Select Exam"}
                    </Text>
                    <Feather
                      name="chevron-down"
                      size={18}
                      color={isExamDropdownOpen ? "#D4AF37" : "#0D1B2A"}
                    />
                  </TouchableOpacity>

                  {/* Dropdown Options List */}
                  {isExamDropdownOpen && (
                    <View className="w-full bg-white border-x border-b border-[#E4E2E1] rounded-b-lg overflow-hidden shadow-sm max-h-48">
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {examOptions.map((exam) => (
                          <TouchableOpacity
                            key={exam.id}
                            onPress={() => handleExamSelect(exam)}
                            className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                          >
                            <Text
                              className="text-[#0D1B2A] font-inter text-sm font-medium"
                              numberOfLines={1}
                            >
                              {exam.exam_name} — {exam.subject_name} ({exam.formatted_date})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* STEP 3: Marks Table */}
          {selectedClass && selectedExam && (
            <View className="mt-4">
              {/* Header Row */}
              <View className="flex-row items-center justify-between pb-2 border-b border-[#E4E2E1] px-1 mb-2">
                <View style={{ flex: 2 }}>
                  <Text
                    style={{ fontFamily: "OpenSans-Bold" }}
                    className="text-[#44474C] text-[11px] font-bold uppercase tracking-widest"
                  >
                    Student
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="items-end">
                  <Text
                    style={{ fontFamily: "OpenSans-Bold" }}
                    className="text-[#44474C] text-[11px] font-bold uppercase tracking-widest text-right"
                  >
                    Max: {selectedExam.total_marks}
                  </Text>
                </View>
              </View>

              {/* Students List */}
              {students.length === 0 ? (
                <View className="bg-white rounded-2xl p-6 items-center justify-center border border-gray-100 shadow-sm">
                  <Feather name="users" size={32} color="#D4AF37" />
                  <Text className="font-inter text-gray-400 text-xs mt-2 text-center">
                    No active students enrolled in this section.
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    overflow: "hidden",
                    shadowColor: "rgba(0,0,0,0.04)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  className="border border-gray-100 mb-6"
                >
                  {students.map((student) => {
                    const isInvalid = isInputInvalid(student.id);
                    const rollPrefix = student.roll_number ? `${student.roll_number}. ` : "";

                    return (
                      <View
                        key={student.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          borderBottomWidth: 1,
                          borderBottomColor: "#E4E2E1",
                        }}
                        className="last:border-b-0"
                      >
                        {/* Name Column */}
                        <View style={{ flex: 2 }} className="pr-2">
                          <Text
                            style={{ fontFamily: "Inter-Medium" }}
                            className="text-[#0D1B2A] text-sm font-semibold leading-tight"
                            numberOfLines={2}
                          >
                            {rollPrefix}
                            {student.full_name}
                          </Text>
                        </View>

                        {/* Input Column */}
                        <View style={{ flex: 1 }} className="items-end">
                          <TextInput
                            style={{
                              width: 72,
                              height: 40,
                              textAlign: "center",
                              borderWidth: 1,
                              borderColor: isInvalid ? "#DC2626" : "#E4E2E1",
                              borderRadius: 8,
                              fontFamily: "Poppins-Bold",
                              fontSize: 16,
                              color: "#0D1B2A",
                              backgroundColor: "#FFFFFF",
                            }}
                            placeholder="—"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={marksMap[student.id] || ""}
                            onChangeText={(val) => handleMarkChange(student.id, val)}
                          />
                          {isInvalid && (
                            <Text
                              style={{ fontFamily: "OpenSans" }}
                              className="text-[10px] text-[#DC2626] mt-0.5"
                            >
                              Max {selectedExam.total_marks}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Save Button */}
              {students.length > 0 && (
                <TouchableOpacity
                  disabled={saveDisabled}
                  onPress={saveMarks}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#0D1B2A",
                    height: 56,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: saveDisabled ? 0.5 : 1,
                    shadowColor: "#0D1B2A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                  className="w-full flex-row"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#D4AF37" className="mr-2" />
                  ) : null}
                  <Text
                    style={{ fontFamily: "Poppins-SemiBold", color: "#D4AF37" }}
                    className="text-[16px] font-bold"
                  >
                    {saving ? "Saving..." : "Save Marks"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
