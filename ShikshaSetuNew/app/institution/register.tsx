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
  const { institutionId } = useAuth();
  
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
  const [studentCode, setStudentCode] = useState("GS-STU-0001");
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("LKG");
  const [studentSection, setStudentSection] = useState("A");
  const [sections, setSections] = useState<string[]>([]);
  const [dob, setDob] = useState("");
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

  const resetForms = () => {
    setStep(1);
    setStudentName("");
    setDob("");
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
      if (!studentName.trim() || !dob.trim()) {
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
        dob: dob.trim(),
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
        rollNumber: res.portalId.includes("GS-STU-") 
          ? `#${res.portalId.split("GS-STU-")[1]}` 
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
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <Header title="Institution Forms" />

      {step <= 3 && (
        <View className="px-5 pt-4 pb-2 flex-row justify-between items-center bg-[#FDF9F1]">
          {/* Form Selector Tabs */}
          <View className="flex-row bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 mr-4">
            <TouchableOpacity
              onPress={() => {
                setRegType("student");
                setStep(1);
              }}
              className={`flex-1 py-2 items-center ${
                regType === "student" ? "bg-[#0F1C2C]" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-poppins-semibold ${
                  regType === "student" ? "text-[#ffe088]" : "text-[#0F1C2C]"
                }`}
              >
                Student Registration
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setRegType("teacher");
                setStep(1);
              }}
              className={`flex-1 py-2 items-center ${
                regType === "teacher" ? "bg-[#0F1C2C]" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-poppins-semibold ${
                  regType === "teacher" ? "text-[#ffe088]" : "text-[#0F1C2C]"
                }`}
              >
                Teacher Appointment
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Step Indicators */}
          <View className="flex-row space-x-1">
            <View
              className={`w-4 h-2 rounded-full ${
                step >= 1 ? "bg-[#735c00]" : "bg-gray-200"
              }`}
            />
            <View
              className={`w-4 h-2 rounded-full ${
                step >= 2 ? "bg-[#735c00]" : "bg-gray-200"
              }`}
            />
            {regType === "student" && (
              <View
                className={`w-4 h-2 rounded-full ${
                  step >= 3 ? "bg-[#735c00]" : "bg-gray-200"
                }`}
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
          
          <Text className="text-2xl font-poppins-bold text-[#0F1C2C] text-center">
            {regType === "student" ? "Registration Successful" : "Appointment Successful"}
          </Text>
          <Text className="text-xs text-neutral-steel font-inter text-center mt-1 max-w-xs">
            {regType === "student"
              ? `${registeredUser?.fullName || studentName} has been successfully registered under ${studentGrade}-${studentSection}. Roll number ${registeredUser?.rollNumber || "#45"} assigned.`
              : `${registeredUser?.fullName || teacherName} has been successfully appointed as Faculty Instructor.`}
          </Text>

          {/* Details Confirmation Card */}
          <View className="bg-white border border-gray-100 rounded-2xl p-5 w-full mt-8 shadow-sm">
            <Text className="font-poppins-bold text-[#0F1C2C] text-xs mb-3 uppercase tracking-wider text-center border-b border-gray-50 pb-2">
              Credentials Details
            </Text>
            
            <View className="flex-row justify-between mb-2">
              <Text className="text-[10px] text-neutral-steel font-inter">Portal ID</Text>
              <Text className="text-[11px] text-[#0f1c2c] font-poppins-semibold">
                {registeredUser?.portalId || (regType === "student" ? "STU-2026-045" : "TCH-2026-089")}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-[10px] text-neutral-steel font-inter">Temp Password</Text>
              <Text className="text-[11px] text-[#0f1c2c] font-poppins-semibold">
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
            className="bg-[#0F1C2C] py-4 rounded-xl items-center w-full mt-10 shadow-sm flex-row justify-center space-x-2"
          >
            <Ionicons name="home-outline" size={16} color="#ffe088" />
            <Text className="text-[#ffe088] font-poppins-bold text-xs">
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
                    <Text className="text-[#0F1C2C] font-poppins-bold text-sm mb-4">
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
                    />

                    {/* DOB */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Date of Birth
                    </Text>
                    <TextInput
                      value={dob}
                      onChangeText={setDob}
                      placeholder="e.g. May 14, 2008"
                      placeholderTextColor="#9CA3AF"
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
                    />

                    {/* Class Selector */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Class
                    </Text>
                    <View className="flex-row flex-wrap justify-between gap-y-2 mb-4">
                      {CLASSES.map((grade) => (
                        <TouchableOpacity
                          key={grade}
                          onPress={() => setStudentGrade(grade)}
                          className={`w-[32%] py-2.5 rounded-lg border items-center ${
                            studentGrade === grade
                              ? "bg-[#0F1C2C] border-[#0F1C2C]"
                              : "bg-[#FCFAFA] border-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-poppins-semibold ${
                              studentGrade === grade ? "text-[#ffe088]" : "text-neutral-steel"
                            }`}
                          >
                            {grade}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

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
                              className={`flex-1 py-2.5 rounded-lg border items-center ${
                                studentSection === sec
                                  ? "bg-[#0F1C2C] border-[#0F1C2C]"
                                  : "bg-[#FCFAFA] border-gray-200"
                              }`}
                            >
                              <Text
                                className={`text-[10px] font-poppins-semibold ${
                                  studentSection === sec ? "text-[#ffe088]" : "text-neutral-steel"
                                }`}
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
                          className={`flex-1 py-2.5 rounded-lg border items-center ${
                            gender === gen
                              ? "bg-[#0F1C2C] border-[#0F1C2C]"
                              : "bg-[#FCFAFA] border-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-poppins-semibold ${
                              gender === gen ? "text-[#ffe088]" : "text-neutral-steel"
                            }`}
                          >
                            {gen}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Next Button */}
                    <TouchableOpacity
                      onPress={handleNextStepStudent}
                      className="bg-[#0F1C2C] py-4 rounded-xl items-center flex-row justify-center space-x-2"
                    >
                      <Text className="text-[#ffe088] font-poppins-bold text-xs">
                        Next Step: Background Details
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#ffe088" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 2: DETAILS & BACKGROUND */}
                {step === 2 && (
                  <View>
                    <Text className="text-[#0F1C2C] font-poppins-bold text-sm mb-4">
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
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
                          className={`flex-1 py-2.5 rounded-lg border items-center ${
                            transport === tr
                              ? "bg-[#0F1C2C] border-[#0F1C2C]"
                              : "bg-[#FCFAFA] border-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-poppins-semibold ${
                              transport === tr ? "text-[#ffe088]" : "text-neutral-steel"
                            }`}
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-6 font-inter text-xs text-[#0F1C2C]"
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
                        className="flex-[2] bg-[#0F1C2C] py-4 rounded-xl items-center flex-row justify-center space-x-1"
                      >
                        <Text className="text-[#ffe088] font-poppins-bold text-xs">
                          Continue
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#ffe088" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* STEP 3: GUARDIAN DETAILS & CONFIRMATION */}
                {step === 3 && (
                  <View>
                    <Text className="text-[#0F1C2C] font-poppins-bold text-sm mb-4">
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
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
                      className="bg-[#FCFAFA] border border-gray-200 px-4 py-3.5 rounded-xl mb-6 font-inter text-xs text-[#0F1C2C]"
                    />

                    {/* Declaration Policy */}
                    <TouchableOpacity
                      onPress={() => setDeclarationAccepted(!declarationAccepted)}
                      className="flex-row items-start space-x-3 mb-6 bg-[#FDF9F1] p-3 rounded-xl border border-gray-200/50"
                    >
                      <View className="mt-0.5">
                        <Ionicons
                          name={declarationAccepted ? "checkbox" : "square-outline"}
                          size={18}
                          color={declarationAccepted ? "#735c00" : "#9CA3AF"}
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
                        className="flex-[2] bg-[#0f1c2c] py-4 rounded-xl items-center flex-row justify-center space-x-1 active:opacity-90"
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#ffe088" />
                        ) : (
                          <>
                            <Text className="text-[#ffe088] font-poppins-bold text-xs">
                              Confirm & Register
                            </Text>
                            <Ionicons name="shield-checkmark-outline" size={16} color="#ffe088" />
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
                    <Text className="text-[#0F1C2C] font-poppins-bold text-sm mb-4">
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
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs text-[#0F1C2C] ${teacherErrors.teacherName ? "border-red-400" : "border-gray-200"}`}
                    />
                    {teacherErrors.teacherName && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherName}</Text>}
                    {!teacherErrors.teacherName && <View className="mb-3" />}

                    {/* Subject Specialization — Multi-select Chips */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Subject Specialization
                    </Text>
                    {loadingSubjects ? (
                      <View className="flex-row items-center py-3 mb-1">
                        <ActivityIndicator size="small" color="#735c00" />
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
                              className={`px-3 py-2 rounded-lg border ${selected ? "bg-[#735c00] border-[#735c00]" : "bg-[#FCFAFA] border-gray-200"}`}
                            >
                              <Text className={`text-[10px] font-poppins-semibold ${selected ? "text-white" : "text-neutral-steel"}`}>
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
                        <ActivityIndicator size="small" color="#735c00" />
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
                              className={`px-3 py-2 rounded-lg border ${selected ? "bg-[#735c00] border-[#735c00]" : "bg-[#FCFAFA] border-gray-200"}`}
                            >
                              <Text className={`text-[10px] font-poppins-semibold ${selected ? "text-white" : "text-neutral-steel"}`}>
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
                      <Text className={`font-inter text-xs ${teacherDob ? "text-[#0F1C2C]" : "text-[#9CA3AF]"}`}>
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
                          className={`flex-1 py-2.5 rounded-lg border items-center ${
                            teacherGender === gen
                              ? "bg-[#735c00] border-[#735c00]"
                              : "bg-[#FCFAFA] border-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-poppins-semibold ${
                              teacherGender === gen ? "text-white" : "text-neutral-steel"
                            }`}
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
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs text-[#0F1C2C] ${teacherErrors.teacherContact ? "border-red-400" : "border-gray-200"}`}
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
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs text-[#0F1C2C] ${teacherErrors.teacherEmail ? "border-red-400" : "border-gray-200"}`}
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
                      className={`bg-[#FCFAFA] border px-4 py-3 rounded-xl mb-1 font-inter text-xs text-[#0F1C2C] min-h-[72px] ${teacherErrors.teacherAddress ? "border-red-400" : "border-gray-200"}`}
                    />
                    {teacherErrors.teacherAddress && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-4">{teacherErrors.teacherAddress}</Text>}
                    {!teacherErrors.teacherAddress && <View className="mb-4" />}

                    {/* Next Button */}
                    <TouchableOpacity
                      onPress={handleRegisterTeacher}
                      className="bg-[#0F1C2C] py-4 rounded-xl items-center flex-row justify-center space-x-2"
                    >
                      <Text className="text-[#ffe088] font-poppins-bold text-xs">
                        Next: Experience & Bio
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#ffe088" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 2: DETAILS & BIO */}
                {step === 2 && (
                  <View>
                    <Text className="text-[#0F1C2C] font-poppins-bold text-sm mb-4">
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
                      <Text className={`font-inter text-xs ${doj ? "text-[#0F1C2C]" : "text-[#9CA3AF]"}`}>
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
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs text-[#0F1C2C] ${teacherErrors.experience ? "border-red-400" : "border-gray-200"}`}
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
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs text-[#0F1C2C] ${teacherErrors.qualification ? "border-red-400" : "border-gray-200"}`}
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
                      className={`bg-[#FCFAFA] border px-4 py-3.5 rounded-xl mb-1 font-inter text-xs text-[#0F1C2C] ${teacherErrors.teacherEmergencyContact ? "border-red-400" : "border-gray-200"}`}
                    />
                    {teacherErrors.teacherEmergencyContact && <Text className="text-red-500 text-[10px] font-inter ml-1 mb-3">{teacherErrors.teacherEmergencyContact}</Text>}
                    {!teacherErrors.teacherEmergencyContact && <View className="mb-3" />}

                    {/* Sections — Multi-select Chips (derived from class-sections data) */}
                    <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                      Sections
                    </Text>
                    {loadingClasses ? (
                      <View className="flex-row items-center py-3 mb-1">
                        <ActivityIndicator size="small" color="#735c00" />
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
                                className={`px-4 py-2 rounded-lg border ${selected ? "bg-[#735c00] border-[#735c00]" : "bg-[#FCFAFA] border-gray-200"}`}
                              >
                                <Text className={`text-[10px] font-poppins-semibold ${selected ? "text-white" : "text-neutral-steel"}`}>
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
                        className="flex-[2] bg-[#0f1c2c] py-4 rounded-xl items-center flex-row justify-center space-x-1 active:opacity-90"
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#ffe088" />
                        ) : (
                          <>
                            <Text className="text-[#ffe088] font-poppins-bold text-xs">
                              Confirm Appointment
                            </Text>
                            <Ionicons name="checkbox-outline" size={16} color="#ffe088" />
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
