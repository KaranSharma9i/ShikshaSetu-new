import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { useAuth } from "../../src/hooks/useAuth";
import { registerStudent, appointTeacher, getNextStudentCode, getSectionsForClass, getSubjectsForTeacherForm, getClassesWithSectionsForTeacherForm } from "../../src/repositories/registrationRepository";
import { handleError } from "../../src/utils/error";
import { deriveInstitutionPrefix } from "../../src/utils/deriveInstitutionPrefix";
import { supabase } from "../../src/lib/supabase";

const CLASSES = [
  "LKG",
  "UKG",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12"
];

export default function RegisterUser() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const { institutionId, institutionName, theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#F2C14E";
  const creamColor = theme?.colors?.cream ?? "#F5F0E8";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";
  
  // Registration type state (toggle between student and teacher)
  const [regType, setRegType] = useState<"student" | "teacher">(
    type === "teacher" ? "teacher" : "student"
  );

  // Steps state
  const [step, setStep] = useState(1); // 1, 2, or 3 (Success)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{
    fullName: string;
    portalId: string;
    tempPassword: string;
    rollNumber?: string;
  } | null>(null);
  
  // Student Form State
  const [studentCode, setStudentCode] = useState(
    institutionName
      ? `${deriveInstitutionPrefix(institutionName)}-STU-0001`
      : "SCH-STU-0001"
  );
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("LKG");
  const [studentSection, setStudentSection] = useState("A");
  const [sections, setSections] = useState<string[]>([]);
  const [dob, setDob] = useState<Date | null>(null);
  const [showStudentDobPicker, setShowStudentDobPicker] = useState(false);
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState("");
  const [transport, setTransport] = useState("School Shuttle");
  const [prevInst, setPrevInst] = useState("");
  const [gpa, setGpa] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRel, setGuardianRel] = useState("Mother");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Teacher Form State
  const [teacherName, setTeacherName] = useState("");
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);
  const [teacherDob, setTeacherDob] = useState<Date | null>(null);
  const [teacherGender, setTeacherGender] = useState("");
  const [teacherContact, setTeacherContact] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherAddress, setTeacherAddress] = useState("");
  const [doj, setDoj] = useState<Date | null>(null);
  const [experience, setExperience] = useState("");
  const [qualification, setQualification] = useState("");
  const [teacherEmergencyContact, setTeacherEmergencyContact] = useState("");
  const [teacherSections, setTeacherSections] = useState<string[]>([]);

  // Dynamic data for teacher form
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string }[]>([]);
  const [classSectionsList, setClassSectionsList] = useState<{ class_name: string; section_name: string; label: string }[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Dynamic data for student form classes
  const [studentClasses, setStudentClasses] = useState<{ id: string; name: string }[]>([]);
  const [loadingStudentClasses, setLoadingStudentClasses] = useState(true);

  // Date picker visibility
  const [showTeacherDobPicker, setShowTeacherDobPicker] = useState(false);
  const [showDojPicker, setShowDojPicker] = useState(false);

  // Teacher form validation errors
  const [teacherErrors, setTeacherErrors] = useState<Record<string, string>>({});

  // Load next student code
  useEffect(() => {
    if (institutionId && regType === "student") {
      getNextStudentCode(institutionId).then((code) => {
        setStudentCode(code);
      });
    }
  }, [institutionId, regType]);

  // Load sections dynamically when studentGrade changes
  useEffect(() => {
    if (institutionId && studentGrade && regType === "student") {
      getSectionsForClass(institutionId, studentGrade).then((secList) => {
        setSections(secList);
        if (secList.length > 0 && !secList.includes(studentSection)) {
          setStudentSection(secList[0]);
        }
      });
    }
  }, [institutionId, studentGrade, regType]);

  // Load subjects and classes for teacher form
  useEffect(() => {
    if (institutionId && regType === "teacher") {
      setLoadingSubjects(true);
      getSubjectsForTeacherForm(institutionId)
        .then((data) => setSubjectsList(data))
        .catch((err) => console.error("Failed to load subjects:", err))
        .finally(() => setLoadingSubjects(false));

      setLoadingClasses(true);
      getClassesWithSectionsForTeacherForm(institutionId)
        .then((data) => setClassSectionsList(data))
        .catch((err) => console.error("Failed to load classes:", err))
        .finally(() => setLoadingClasses(false));
    }
  }, [institutionId, regType]);

  // Load classes dynamically for student form
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingStudentClasses(true);
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name")
          .eq("institution_id", institutionId)
          .order("grade_number", { ascending: true });

        if (!error && data) {
          setStudentClasses(data);
          if (data.length > 0) {
            const defaultClass = data.find(c => c.name === "LKG") || data[0];
            setStudentGrade(defaultClass.name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch classes:", err);
      } finally {
        setLoadingStudentClasses(false);
      }
    };

    if (institutionId) {
      fetchClasses();
    }
  }, [institutionId]);

  const resetForms = () => {
    setStep(1);
    setStudentName("");
    setDob(null);
    setShowStudentDobPicker(false);
    setAddress("");
    setPrevInst("");
    setGpa("");
    setGuardianName("");
    setGuardianEmail("");
    setGuardianPhone("");
    setStudentEmail("");
    setDeclarationAccepted(false);
    setStudentSection("A");
    setSections([]);
    
    setTeacherName("");
    setTeacherSubjects([]);
    setTeacherClasses([]);
    setTeacherDob(null);
    setTeacherGender("");
    setTeacherContact("");
    setTeacherEmail("");
    setTeacherAddress("");
    setDoj(null);
    setExperience("");
    setQualification("");
    setTeacherEmergencyContact("");
    setTeacherSections([]);
    setTeacherErrors({});
    setRegisteredUser(null);

    if (institutionId) {
      getNextStudentCode(institutionId).then((code) => {
        setStudentCode(code);
      });
    }
  };

  const handleNextStepStudent = () => {
    if (step === 1) {
      if (!studentName.trim() || !dob) {
        Alert.alert("Input Required", "Please enter Candidate Name and Date of Birth.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!address.trim() || !prevInst.trim() || !gpa.trim() || !guardianEmail.trim() || !guardianPhone.trim()) {
        Alert.alert("Input Required", "Please enter Address, Previous School, GPA, and Guardian details.");
        return;
      }
      setStep(3);
    }
  };

  const handleRegisterStudent = async () => {
    if (!guardianName.trim() || !guardianRel.trim() || !studentEmail.trim()) {
      Alert.alert("Input Required", "Please enter Guardian Name, Relationship, and Student Email.");
      return;
    }
    if (!declarationAccepted) {
      Alert.alert("Policy Agreement", "Please agree to the Institutional Code of Conduct & Policies before registering.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerStudent(institutionId || "", {
        name: studentName.trim(),
        grade: studentGrade,
        dob: dob ? dob.toISOString().slice(0, 10) : "",
        gender,
        address: address.trim(),
        prevInst: prevInst.trim(),
        gpa: gpa.trim(),
        guardianName: guardianName.trim(),
        guardianRel,
        guardianEmail: guardianEmail.trim(),
        guardianPhone: guardianPhone.trim(),
        studentCode,
        studentEmail: studentEmail.trim(),
        transport,
        section: studentSection,
      });

      setRegisteredUser({
        fullName: res.fullName,
        portalId: res.portalId,
        tempPassword: res.tempPassword,
        rollNumber: res.portalId.includes("-STU-") 
          ? `#${res.portalId.split("-STU-")[1]}` 
          : `#45`,
      });
      setStep(4);
    } catch (err: any) {
      handleError(err, "Student Registration Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateTeacherStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!teacherName.trim()) errors.teacherName = "Faculty name is required";
    if (teacherSubjects.length === 0) errors.teacherSubjects = "Select at least one subject";
    if (teacherClasses.length === 0) errors.teacherClasses = "Select at least one class";
    if (!teacherDob) {
      errors.teacherDob = "Date of birth is required";
    } else if (teacherDob >= new Date()) {
      errors.teacherDob = "Date of birth must be a past date";
    }
    if (!teacherGender) errors.teacherGender = "Please select a gender";
    if (!teacherContact.trim()) {
      errors.teacherContact = "Contact number is required";
    } else if (!/^\d{10,15}$/.test(teacherContact.replace(/[\s\-\+]/g, ""))) {
      errors.teacherContact = "Enter a valid phone number (10+ digits)";
    }
    if (!teacherEmail.trim()) {
      errors.teacherEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail.trim())) {
      errors.teacherEmail = "Enter a valid email address";
    }
    if (!teacherAddress.trim()) errors.teacherAddress = "Address is required";
    
    setTeacherErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTeacherStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!doj) {
      errors.doj = "Date of joining is required";
    }
    if (!experience.trim()) errors.experience = "Teaching experience is required";
    if (!qualification.trim()) errors.qualification = "Qualification is required";
    if (!teacherEmergencyContact.trim()) {
      errors.teacherEmergencyContact = "Emergency contact is required";
    } else if (!/^\d{10,15}$/.test(teacherEmergencyContact.replace(/[\s\-\+]/g, ""))) {
      errors.teacherEmergencyContact = "Enter a valid phone number (10+ digits)";
    }
    
    setTeacherErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  };

  const handleStudentDobChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStudentDobPicker(Platform.OS === "ios");
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  const handleTeacherDobChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTeacherDobPicker(Platform.OS === "ios");
    if (selectedDate) {
      setTeacherDob(selectedDate);
      setTeacherErrors((prev) => { const n = { ...prev }; delete n.teacherDob; return n; });
    }
  };

  const handleDojChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDojPicker(Platform.OS === "ios");
    if (selectedDate) {
      setDoj(selectedDate);
      setTeacherErrors((prev) => { const n = { ...prev }; delete n.doj; return n; });
    }
  };

  const toggleChipSelection = (
    value: string,
    currentSelection: string[],
    setSelection: React.Dispatch<React.SetStateAction<string[]>>,
    errorKey: string
  ) => {
    if (currentSelection.includes(value)) {
      setSelection(currentSelection.filter((v) => v !== value));
    } else {
      setSelection([...currentSelection, value]);
    }
    setTeacherErrors((prev) => { const n = { ...prev }; delete n[errorKey]; return n; });
  };

  const handleRegisterTeacher = async () => {
    if (step === 1) {
      if (!validateTeacherStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateTeacherStep2()) return;

      setIsSubmitting(true);
      try {
        const res = await appointTeacher(institutionId || "", {
          name: teacherName.trim(),
          subjects: teacherSubjects,
          classes: teacherClasses,
          dob: teacherDob ? teacherDob.toISOString().slice(0, 10) : "",
          gender: teacherGender,
          contactNumber: teacherContact.trim(),
          email: teacherEmail.trim(),
          address: teacherAddress.trim(),
          doj: doj ? doj.toISOString().slice(0, 10) : "",
          experience: experience.trim(),
          qualification: qualification.trim(),
          emergencyContact: teacherEmergencyContact.trim(),
          sections: teacherSections,
        });

        setRegisteredUser({
          fullName: res.fullName,
          portalId: res.portalId,
          tempPassword: res.tempPassword,
        });
        setStep(4);
      } catch (err: any) {
        handleError(err, "Teacher Appointment Failed");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="Institution Forms" />

      {step <= 3 && (
        <View className="px-5 pt-4 pb-2 flex-row justify-between items-center" style={{ backgroundColor: creamColor }}>
          {/* Form Selector Tabs */}
          <View className="flex-row bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 mr-4">
            <TouchableOpacity
              onPress={() => {
                setRegType("student");
                setStep(1);
              }}
              className="flex-1 py-2 items-center"
              style={{ backgroundColor: regType === "student" ? primaryColor : "transparent" }}
            >
              <Text
                className="text-xs font-poppins-semibold"
                style={{ color: regType === "student" ? secondaryColor : primaryColor }}
              >
                Student Registration
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setRegType("teacher");
                setStep(1);
              }}
              className="flex-1 py-2 items-center"
              style={{ backgroundColor: regType === "teacher" ? primaryColor : "transparent" }}
            >
              <Text
                className="text-xs font-poppins-semibold"
                style={{ color: regType === "teacher" ? secondaryColor : primaryColor }}
              >
                Teacher Appointment
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Step Indicators */}
          <View className="flex-row space-x-1">
            <View
              className="w-4 h-2 rounded-full"
              style={{ backgroundColor: step >= 1 ? secondaryColor : "#E5E7EB" }}
            />
            <View
              className="w-4 h-2 rounded-full"
              style={{ backgroundColor: step >= 2 ? secondaryColor : "#E5E7EB" }}
            />
            {regType === "student" && (
              <View
                className="w-4 h-2 rounded-full"
                style={{ backgroundColor: step >= 3 ? secondaryColor : "#E5E7EB" }}
              />
            )}
          </View>
        </View>
      )}

      {/* SUCCESS OVERLAY PAGE */}
      {step === 4 ? (
        <ScrollView key="registration-success-scroll" className="flex-grow px-5 py-8" contentContainerStyle={{ alignItems: "center", justifyContent: "center", flexGrow: 1 }}>
          <View className="w-24 h-24 rounded-full bg-emerald-50 items-center justify-center mb-6 border border-emerald-200 shadow-sm">
            <Ionicons name="checkmark-circle" size={56} color="#059669" />
          </View>
          
          <Text className="text-2xl font-poppins-bold text-center" style={{ color: primaryColor }}>
            {regType === "student" ? "Registration Successful" : "Appointment Successful"}
          </Text>
          <Text className="text-xs text-neutral-steel font-inter text-center mt-1 max-w-xs">
            {regType === "student"
              ? `${registeredUser?.fullName || studentName} has been successfully registered under ${studentGrade}-${studentSection}. Roll number ${registeredUser?.rollNumber || "#45"} assigned.`
              : `${registeredUser?.fullName || teacherName} has been successfully appointed as Faculty Instructor.`}
          </Text>

          {/* Details Confirmation Card */}
          <View className="bg-white border border-gray-100 rounded-2xl p-5 w-full mt-8 shadow-sm">
            <Text className="font-poppins-bold text-xs mb-3 uppercase tracking-wider text-center border-b border-gray-50 pb-2" style={{ color: primaryColor }}>
              Credentials Details
            </Text>
            
            <View className="flex-row justify-between mb-2">
              <Text className="text-[10px] text-neutral-steel font-inter">Portal ID</Text>
              <Text className="text-[11px] font-poppins-semibold" style={{ color: primaryColor }}>
                {registeredUser?.portalId || (regType === "student" ? "STU-2026-045" : "TCH-2026-089")}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-[10px] text-neutral-steel font-inter">Temp Password</Text>
              <Text className="text-[11px] font-poppins-semibold" style={{ color: primaryColor }}>
                {registeredUser?.tempPassword || "GURK2026"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[10px] text-neutral-steel font-inter">Account Status</Text>
              <Text className="text-[10px] text-emerald-600 font-poppins-bold uppercase">Active</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              resetForms();
              router.replace("/institution" as any);
            }}
            className="py-4 rounded-xl items-center w-full mt-10 shadow-sm flex-row justify-center space-x-2"
            style={{ backgroundColor: primaryColor }}
          >
            <Ionicons name="home-outline" size={16} color={secondaryColor} />
            <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
              Return to Dashboard
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          key="registration-form-scroll"
          className="flex-grow"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* STUDENT FORM IMPLEMENTATION */}
          {regType === "student" && (
            <View className="px-5 pt-4">
              <View className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
                
                {/* STEP 1: PERSONAL CANDIDATE INFO */}
                {step === 1 && (
                  <View>
                    <Text className="font-poppins-bold text-sm mb-4" style={{ color: primaryColor }}>
                      Step 1: Candidate Identity
                    </Text>

                    {/* Student Code */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Student Code
                    </Text>
                    <TextInput
                      value={studentCode}
                      editable={false}
                      className="bg-gray-100 border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-gray-500"
                    />

                    {/* Candidate Name */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Candidate Full Name
                    </Text>
                    <TextInput
                      value={studentName}
                      onChangeText={setStudentName}
                      placeholder="e.g. Alexander J. Sterling"
                      placeholderTextColor="#9CA3AF"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* DOB */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Date of Birth
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowStudentDobPicker(true)}
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 flex-row items-center justify-between"
                    >
                      <Text className="font-inter text-xs" style={{ color: dob ? primaryColor : "#9CA3AF" }}>
                        {dob ? formatDateDisplay(dob) : "Select date of birth"}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                    {showStudentDobPicker && (
                      <DateTimePicker
                        value={dob || new Date(2010, 0, 1)}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        maximumDate={new Date()}
                        onChange={handleStudentDobChange}
                      />
                    )}

                    {/* Class Selector */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Class
                    </Text>
                    {loadingStudentClasses ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator size="small" color={secondaryColor} />
                      </View>
                    ) : studentClasses.length === 0 ? (
                      <Text className="text-xs text-neutral-steel italic my-2 ml-1">
                        No classes found for this institution
                      </Text>
                    ) : (
                      <View className="flex-row flex-wrap justify-between gap-y-2 mb-4">
                        {studentClasses.map((cls) => {
                          const displayName = cls.name.match(/^(Grade|Class|LKG|UKG)/i) ? cls.name : `Grade ${cls.name}`;
                          return (
                            <TouchableOpacity
                              key={cls.id}
                              onPress={() => setStudentGrade(cls.name)}
                              className="w-[32%] py-2.5 rounded-lg border items-center"
                              style={{
                                backgroundColor: studentGrade === cls.name ? primaryColor : "#FCFAFA",
                                borderColor: studentGrade === cls.name ? primaryColor : "#E5E7EB"
                              }}
                            >
                              <Text
                                className="text-[10px] font-poppins-semibold"
                                style={{
                                  color: studentGrade === cls.name ? secondaryColor : "#75777D"
                                }}
                              >
                                {displayName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Section Selector */}
                    {studentGrade && sections.length > 0 && (
                      <View className="mb-4">
                        <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                          Section
                        </Text>
                        <View className="flex-row gap-2">
                          {sections.map((sec) => (
                            <TouchableOpacity
                              key={sec}
                              onPress={() => setStudentSection(sec)}
                              className="flex-1 py-2.5 rounded-lg border items-center"
                              style={{
                                backgroundColor: studentSection === sec ? primaryColor : "#FCFAFA",
                                borderColor: studentSection === sec ? primaryColor : "#E5E7EB"
                              }}
                            >
                              <Text
                                className="text-[10px] font-poppins-semibold"
                                style={{
                                  color: studentSection === sec ? secondaryColor : "#75777D"
                                }}
                              >
                                {sec}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Gender Selector */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Gender
                    </Text>
                    <View className="flex-row gap-2 mb-6">
                      {["Male", "Female", "Other"].map((gen) => (
                        <TouchableOpacity
                          key={gen}
                          onPress={() => setGender(gen)}
                          className="flex-1 py-2.5 rounded-lg border items-center"
                          style={{
                            backgroundColor: gender === gen ? primaryColor : "#FCFAFA",
                            borderColor: gender === gen ? primaryColor : "#E5E7EB"
                          }}
                        >
                          <Text
                            className="text-[10px] font-poppins-semibold"
                            style={{
                              color: gender === gen ? secondaryColor : "#75777D"
                            }}
                          >
                            {gen}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Next Button */}
                    <TouchableOpacity
                      onPress={handleNextStepStudent}
                      className="py-4 rounded-xl items-center flex-row justify-center space-x-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                        Next Step: Background Details
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={secondaryColor} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 2: DETAILS & BACKGROUND */}
                {step === 2 && (
                  <View>
                    <Text className="font-poppins-bold text-sm mb-4" style={{ color: primaryColor }}>
                      Step 2: Address & Academic Background
                    </Text>

                    {/* Home Address */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Home Address
                    </Text>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="e.g. 42 Heritage Oaks Way, State 4022"
                      placeholderTextColor="#9CA3AF"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Transport Option */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Transport Type
                    </Text>
                    <View className="flex-row gap-2 mb-4">
                      {["School Shuttle", "Personal"].map((tr) => (
                        <TouchableOpacity
                          key={tr}
                          onPress={() => setTransport(tr)}
                          className="flex-1 py-2.5 rounded-lg border items-center"
                          style={{
                            backgroundColor: transport === tr ? primaryColor : "#FCFAFA",
                            borderColor: transport === tr ? primaryColor : "#E5E7EB"
                          }}
                        >
                          <Text
                            className="text-[10px] font-poppins-semibold"
                            style={{
                              color: transport === tr ? secondaryColor : "#75777D"
                            }}
                          >
                            {tr}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Previous School */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Previous School
                    </Text>
                    <TextInput
                      value={prevInst}
                      onChangeText={setPrevInst}
                      placeholder="e.g. Saint Jude's Preparatory"
                      placeholderTextColor="#9CA3AF"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Previous GPA */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Previous Final GPA / Marks (%)
                    </Text>
                    <TextInput
                      value={gpa}
                      onChangeText={setGpa}
                      placeholder="e.g. 3.9 / 4.0 (92%)"
                      placeholderTextColor="#9CA3AF"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Guardian Email */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Guardian Email
                    </Text>
                    <TextInput
                      value={guardianEmail}
                      onChangeText={setGuardianEmail}
                      placeholder="e.g. e.sterling@university.edu"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Guardian Phone */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Guardian Mobile Number
                    </Text>
                    <TextInput
                      value={guardianPhone}
                      onChangeText={setGuardianPhone}
                      placeholder="e.g. +1 (555) 012-3456"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-6 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Buttons Layout */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => setStep(1)}
                        className="flex-1 border border-gray-200 py-4 rounded-xl items-center"
                      >
                        <Text className="text-neutral-steel font-poppins-bold text-xs">Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleNextStepStudent}
                        className="flex-[2] py-4 rounded-xl items-center flex-row justify-center space-x-1"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                          Continue
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color={secondaryColor} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* STEP 3: GUARDIAN DETAILS & CONFIRMATION */}
                {step === 3 && (
                  <View>
                    <Text className="font-poppins-bold text-sm mb-4" style={{ color: primaryColor }}>
                      Step 3: Guardian Details & Review
                    </Text>

                    {/* Guardian Name */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Primary Guardian Name
                    </Text>
                    <TextInput
                      value={guardianName}
                      onChangeText={setGuardianName}
                      placeholder="e.g. Dr. Eleanor Sterling"
                      placeholderTextColor="#9CA3AF"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Relationship */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Relationship
                    </Text>
                    <TextInput
                      value={guardianRel}
                      onChangeText={setGuardianRel}
                      placeholder="e.g. Mother, Father"
                      placeholderTextColor="#9CA3AF"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Student Email */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Student Email Address
                    </Text>
                    <TextInput
                      value={studentEmail}
                      onChangeText={setStudentEmail}
                      placeholder="e.g. alex.sterling@gurukulsiksha.edu.in"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-6 font-inter text-xs"
                      style={{ color: primaryColor }}
                    />

                    {/* Declaration Policy */}
                    <TouchableOpacity
                      onPress={() => setDeclarationAccepted(!declarationAccepted)}
                      className="flex-row items-start space-x-3 mb-6 p-3 rounded-xl border border-gray-200/50"
                      style={{ backgroundColor: creamColor }}
                    >
                      <View className="mt-0.5">
                        <Ionicons
                          name={declarationAccepted ? "checkbox" : "square-outline"}
                          size={18}
                          color={declarationAccepted ? secondaryColor : "#9CA3AF"}
                        />
                      </View>
                      <Text className="text-[9px] text-[#778598] font-inter leading-relaxed flex-1">
                        I hereby certify that all information provided is accurate and I agree to abide by the Institutional Code of Conduct and Privacy Policy.
                      </Text>
                    </TouchableOpacity>

                    {/* Buttons Layout */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => setStep(2)}
                        className="flex-1 border border-gray-200 py-4 rounded-xl items-center"
                      >
                        <Text className="text-neutral-steel font-poppins-bold text-xs">Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleRegisterStudent}
                        disabled={isSubmitting}
                        className="flex-[2] py-4 rounded-xl items-center flex-row justify-center space-x-1 active:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color={secondaryColor} />
                        ) : (
                          <>
                            <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                              Confirm & Register
                            </Text>
                            <Ionicons name="shield-checkmark-outline" size={16} color={secondaryColor} />
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </View>
            </View>
          )}

          {/* TEACHER FORM IMPLEMENTATION */}
          {regType === "teacher" && (
            <View className="px-5 pt-4">
              <View className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
                
                {/* STEP 1: APPOINTMENT DETAILS */}
                {step === 1 && (
                  <View>
                    <Text className="font-poppins-bold text-sm mb-4" style={{ color: primaryColor }}>
                      Step 1: Faculty Identity
                    </Text>

                    {/* Teacher Name */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Faculty Member Name
                    </Text>
                    <TextInput
                      value={teacherName}
                      onChangeText={(t) => { setTeacherName(t); setTeacherErrors((p) => { const n = {...p}; delete n.teacherName; return n; }); }}
                      placeholder="e.g. Dr. Amit Sharma"
                      placeholderTextColor="#9CA3AF"
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs ${teacherErrors.teacherName ? "border-red-400" : "border-gray-200"}`}
                      style={{ color: primaryColor }}
                    />
                    {teacherErrors.teacherName && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherName}</Text>}
                    {!teacherErrors.teacherName && <View className="mb-3" />}

                    {/* Subject Specialization — Multi-select Chips */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Subject Specialization
                    </Text>
                    {loadingSubjects ? (
                      <View className="flex-row items-center py-3 mb-1">
                        <ActivityIndicator size="small" color={secondaryColor} />
                        <Text className="text-[10px] text-neutral-steel font-inter ml-2">Loading subjects...</Text>
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap gap-2 mb-1">
                        {subjectsList.map((sub) => {
                          const selected = teacherSubjects.includes(sub.name);
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              onPress={() => toggleChipSelection(sub.name, teacherSubjects, setTeacherSubjects, "teacherSubjects")}
                              className="px-3 py-2 rounded-lg border"
                              style={{
                                backgroundColor: selected ? secondaryColor : "#FCFAFA",
                                borderColor: selected ? secondaryColor : "#E5E7EB"
                              }}
                            >
                              <Text
                                className="text-[10px] font-poppins-semibold"
                                style={{ color: selected ? "white" : "#75777D" }}
                              >
                                {sub.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {subjectsList.length === 0 && !loadingSubjects && (
                          <Text className="text-[10px] text-neutral-steel font-inter py-2">No subjects found</Text>
                        )}
                      </View>
                    )}
                    {teacherErrors.teacherSubjects && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherSubjects}</Text>}
                    {!teacherErrors.teacherSubjects && <View className="mb-3" />}

                    {/* Classes Assigned — Multi-select Chips */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Classes Assigned
                    </Text>
                    {loadingClasses ? (
                      <View className="flex-row items-center py-3 mb-1">
                        <ActivityIndicator size="small" color={secondaryColor} />
                        <Text className="text-[10px] text-neutral-steel font-inter ml-2">Loading classes...</Text>
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap gap-2 mb-1">
                        {classSectionsList.map((cs) => {
                          const selected = teacherClasses.includes(cs.label);
                          return (
                            <TouchableOpacity
                              key={cs.label}
                              onPress={() => toggleChipSelection(cs.label, teacherClasses, setTeacherClasses, "teacherClasses")}
                              className="px-3 py-2 rounded-lg border"
                              style={{
                                backgroundColor: selected ? secondaryColor : "#FCFAFA",
                                borderColor: selected ? secondaryColor : "#E5E7EB"
                              }}
                            >
                              <Text
                                className="text-[10px] font-poppins-semibold"
                                style={{ color: selected ? "white" : "#75777D" }}
                              >
                                {cs.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {classSectionsList.length === 0 && !loadingClasses && (
                          <Text className="text-[10px] text-neutral-steel font-inter py-2">No classes found</Text>
                        )}
                      </View>
                    )}
                    {teacherErrors.teacherClasses && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherClasses}</Text>}
                    {!teacherErrors.teacherClasses && <View className="mb-3" />}

                    {/* Date of Birth */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Date of Birth (DOB)
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowTeacherDobPicker(true)}
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 flex-row items-center justify-between ${teacherErrors.teacherDob ? "border-red-400" : "border-gray-200"}`}
                    >
                      <Text className="font-inter text-xs" style={{ color: teacherDob ? primaryColor : "#9CA3AF" }}>
                        {teacherDob ? formatDateDisplay(teacherDob) : "Select date of birth"}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                    {showTeacherDobPicker && (
                      <DateTimePicker
                        value={teacherDob || new Date(1990, 0, 1)}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        maximumDate={new Date()}
                        onChange={handleTeacherDobChange}
                      />
                    )}
                    {teacherErrors.teacherDob && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherDob}</Text>}
                    {!teacherErrors.teacherDob && <View className="mb-3" />}

                    {/* Gender — Single-select Chips */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Gender
                    </Text>
                    <View className="flex-row gap-2 mb-1">
                      {["Male", "Female", "Other"].map((gen) => (
                        <TouchableOpacity
                          key={gen}
                          onPress={() => { setTeacherGender(gen); setTeacherErrors((p) => { const n = {...p}; delete n.teacherGender; return n; }); }}
                          className="flex-1 py-2.5 rounded-lg border items-center"
                          style={{
                            backgroundColor: teacherGender === gen ? secondaryColor : "#FCFAFA",
                            borderColor: teacherGender === gen ? secondaryColor : "#E5E7EB"
                          }}
                        >
                          <Text
                            className="text-[10px] font-poppins-semibold"
                            style={{ color: teacherGender === gen ? "white" : "#75777D" }}
                          >
                            {gen}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {teacherErrors.teacherGender && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherGender}</Text>}
                    {!teacherErrors.teacherGender && <View className="mb-3" />}

                    {/* Contact Number */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Contact Number
                    </Text>
                    <TextInput
                      value={teacherContact}
                      onChangeText={(t) => { setTeacherContact(t); setTeacherErrors((p) => { const n = {...p}; delete n.teacherContact; return n; }); }}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs ${teacherErrors.teacherContact ? "border-red-400" : "border-gray-200"}`}
                      style={{ color: primaryColor }}
                    />
                    {teacherErrors.teacherContact && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherContact}</Text>}
                    {!teacherErrors.teacherContact && <View className="mb-3" />}

                    {/* Email Address */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Email Address
                    </Text>
                    <TextInput
                      value={teacherEmail}
                      onChangeText={(t) => { setTeacherEmail(t); setTeacherErrors((p) => { const n = {...p}; delete n.teacherEmail; return n; }); }}
                      placeholder="e.g. amit.sharma@school.edu"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs ${teacherErrors.teacherEmail ? "border-red-400" : "border-gray-200"}`}
                      style={{ color: primaryColor }}
                    />
                    {teacherErrors.teacherEmail && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherEmail}</Text>}
                    {!teacherErrors.teacherEmail && <View className="mb-3" />}

                    {/* Address */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Address
                    </Text>
                    <TextInput
                      value={teacherAddress}
                      onChangeText={(t) => { setTeacherAddress(t); setTeacherErrors((p) => { const n = {...p}; delete n.teacherAddress; return n; }); }}
                      placeholder="e.g. 123 Main Street, City, State"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      className={`bg-[#FCFAFA] border px-4 py-3 rounded-xl mb-1 font-inter text-xs min-h-[72px] ${teacherErrors.teacherAddress ? "border-red-400" : "border-gray-200"}`}
                      style={{ color: primaryColor }}
                    />
                    {teacherErrors.teacherAddress && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-4">{teacherErrors.teacherAddress}</Text>}
                    {!teacherErrors.teacherAddress && <View className="mb-4" />}

                    {/* Next Button */}
                    <TouchableOpacity
                      onPress={handleRegisterTeacher}
                      className="py-4 rounded-xl items-center flex-row justify-center space-x-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                        Next: Experience & Bio
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={secondaryColor} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 2: DETAILS & BIO */}
                {step === 2 && (
                  <View>
                    <Text className="font-poppins-bold text-sm mb-4" style={{ color: primaryColor }}>
                      Step 2: Profile Background
                    </Text>

                    {/* DOJ — Date Picker */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Date of Joining (DOJ)
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDojPicker(true)}
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 flex-row items-center justify-between ${teacherErrors.doj ? "border-red-400" : "border-gray-200"}`}
                    >
                      <Text className="font-inter text-xs" style={{ color: doj ? primaryColor : "#9CA3AF" }}>
                        {doj ? formatDateDisplay(doj) : "Select date of joining"}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                    {showDojPicker && (
                      <DateTimePicker
                        value={doj || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleDojChange}
                      />
                    )}
                    {teacherErrors.doj && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.doj}</Text>}
                    {!teacherErrors.doj && <View className="mb-3" />}

                    {/* Experience */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Teaching Experience (Years)
                    </Text>
                    <TextInput
                      value={experience}
                      onChangeText={(t) => { setExperience(t); setTeacherErrors((p) => { const n = {...p}; delete n.experience; return n; }); }}
                      placeholder="e.g. 8 Years"
                      placeholderTextColor="#9CA3AF"
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs ${teacherErrors.experience ? "border-red-400" : "border-gray-200"}`}
                      style={{ color: primaryColor }}
                    />
                    {teacherErrors.experience && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.experience}</Text>}
                    {!teacherErrors.experience && <View className="mb-3" />}

                    {/* Qualification */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Highest Qualification
                    </Text>
                    <TextInput
                      value={qualification}
                      onChangeText={(t) => { setQualification(t); setTeacherErrors((p) => { const n = {...p}; delete n.qualification; return n; }); }}
                      placeholder="e.g. Ph.D. in Applied Mathematics"
                      placeholderTextColor="#9CA3AF"
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs ${teacherErrors.qualification ? "border-red-400" : "border-gray-200"}`}
                      style={{ color: primaryColor }}
                    />
                    {teacherErrors.qualification && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.qualification}</Text>}
                    {!teacherErrors.qualification && <View className="mb-3" />}

                    {/* Emergency Contact Number */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Emergency Contact Number
                    </Text>
                    <TextInput
                      value={teacherEmergencyContact}
                      onChangeText={(t) => { setTeacherEmergencyContact(t); setTeacherErrors((p) => { const n = {...p}; delete n.teacherEmergencyContact; return n; }); }}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs ${teacherErrors.teacherEmergencyContact ? "border-red-400" : "border-gray-200"}`}
                      style={{ color: primaryColor }}
                    />
                    {teacherErrors.teacherEmergencyContact && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherEmergencyContact}</Text>}
                    {!teacherErrors.teacherEmergencyContact && <View className="mb-3" />}

                    {/* Sections — Multi-select Chips (derived from class-sections data) */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Sections
                    </Text>
                    {loadingClasses ? (
                      <View className="flex-row items-center py-3 mb-1">
                        <ActivityIndicator size="small" color={secondaryColor} />
                        <Text className="text-[10px] text-neutral-steel font-inter ml-2">Loading sections...</Text>
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap gap-2 mb-1">
                        {(() => {
                          const uniqueSections = Array.from(new Set(classSectionsList.map((cs) => cs.section_name))).sort();
                          return uniqueSections.map((sec) => {
                            const selected = teacherSections.includes(sec);
                            return (
                              <TouchableOpacity
                                key={sec}
                                onPress={() => toggleChipSelection(sec, teacherSections, setTeacherSections, "teacherSections")}
                                className="px-4 py-2 rounded-lg border"
                                style={{
                                  backgroundColor: selected ? secondaryColor : "#FCFAFA",
                                  borderColor: selected ? secondaryColor : "#E5E7EB"
                                }}
                              >
                                <Text
                                  className="text-[10px] font-poppins-semibold"
                                  style={{ color: selected ? "white" : "#75777D" }}
                                >
                                  {sec}
                                </Text>
                              </TouchableOpacity>
                            );
                          });
                        })()}
                        {classSectionsList.length === 0 && !loadingClasses && (
                          <Text className="text-[10px] text-neutral-steel font-inter py-2">No sections found</Text>
                        )}
                      </View>
                    )}
                    {teacherErrors.teacherSections && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-4">{teacherErrors.teacherSections}</Text>}
                    {!teacherErrors.teacherSections && <View className="mb-4" />}

                    {/* Buttons Layout */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => { setStep(1); setTeacherErrors({}); }}
                        className="flex-1 border border-gray-200 py-4 rounded-xl items-center"
                      >
                        <Text className="text-neutral-steel font-poppins-bold text-xs">Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleRegisterTeacher}
                        disabled={isSubmitting}
                        className="flex-[2] py-4 rounded-xl items-center flex-row justify-center space-x-1 active:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color={secondaryColor} />
                        ) : (
                          <>
                            <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                              Confirm Appointment
                            </Text>
                            <Ionicons name="checkbox-outline" size={16} color={secondaryColor} />
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </View>
            </View>
          )}
        </ScrollView>
      )}

      <BottomNavBar activeTab="utilities" />
    </SafeAreaView>
  );
}
