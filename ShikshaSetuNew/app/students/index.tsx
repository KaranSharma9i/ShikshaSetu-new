import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import Header from "@/components/institution/Header";
import BottomNavBar from "@/components/institution/BottomNavBar";
import {
  getStudents,
  getClasses,
  getSections,
  getTeacherClassesAndSections,
} from "@/src/repositories/studentRepository";
import { StudentListItem, ClassItem, SectionItem } from "@/src/types/student";

export default function StudentListScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, role, userId, institutionId } = useAuth();
  
  // URL Search Params
  const params = useLocalSearchParams<{ classId?: string; sectionId?: string; search?: string }>();
  
  // Filter and Search States
  const [searchVal, setSearchVal] = useState(params.search || "");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  
  // Teacher-scoped data
  const [teacherScopes, setTeacherScopes] = useState<{ classes: ClassItem[]; sections: Record<string, SectionItem[]> } | null>(null);

  // Modal selector states
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);

  // List States
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const LIMIT = 15;

  // Selected details
  const selectedClass = classes.find((c) => c.id === params.classId);
  const selectedSection = sections.find((s) => s.id === params.sectionId);

  // 1. Protection & Role Guard Redirect
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.replace("/onboarding");
      } else if (role !== "institution_admin" && role !== "teacher") {
        router.replace("/");
      }
    }
  }, [isLoaded, isSignedIn, role]);

  // 2. Fetch Filters based on Role
  useEffect(() => {
    if (!isSignedIn || !userId || !institutionId) return;

    async function loadFilters() {
      try {
        if (role === "teacher") {
          // Fetch only classes & sections assigned to teacher
          const scopes = await getTeacherClassesAndSections(userId!);
          setTeacherScopes(scopes);
          setClasses(scopes.classes);
          
          // Auto-select first class & section if none selected in params
          if (scopes.classes.length > 0 && !params.classId) {
            const firstClass = scopes.classes[0];
            const firstClassSecs = scopes.sections[firstClass.id] || [];
            const firstSectionId = firstClassSecs.length > 0 ? firstClassSecs[0].id : "";
            
            router.setParams({
              classId: firstClass.id,
              sectionId: firstSectionId
            });
            setSections(firstClassSecs);
          } else if (params.classId) {
            setSections(scopes.sections[params.classId] || []);
          }
        } else {
          // Admin: Fetch all classes
          const classesData = await getClasses(institutionId!);
          setClasses(classesData);

          if (classesData.length > 0 && !params.classId) {
            const firstClass = classesData[0];
            router.setParams({ classId: firstClass.id });
          }
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }

    loadFilters();
  }, [isSignedIn, userId, institutionId, role]);

  // 3. Fetch sections when selected class changes (for Admin)
  useEffect(() => {
    if (role === "teacher" || !params.classId) return;
    
    async function loadSections() {
      try {
        const sectionsData = await getSections(params.classId!);
        setSections(sectionsData);
        // Reset sectionId if it's not in the new class
        if (sectionsData.length > 0 && !sectionsData.some(s => s.id === params.sectionId)) {
          router.setParams({ sectionId: sectionsData[0].id });
        }
      } catch (err) {
        console.error("Failed to load sections", err);
      }
    }

    loadSections();
  }, [params.classId, role]);

  // 4. Debounced Search Parameter Sync
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      router.setParams({ search: searchVal });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchVal]);

  // 5. Fetch Students List (Reset pagination when filter changes)
  const fetchStudents = useCallback(async (pageNum: number, isAppend: boolean) => {
    if (!institutionId) return;
    
    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsPageLoading(true);
    }
    setError(null);

    try {
      const data = await getStudents(
        institutionId,
        params.search,
        params.classId,
        params.sectionId
      );

      // Perform local pagination on the database results
      const startIndex = (pageNum - 1) * LIMIT;
      const paginatedData = data.slice(startIndex, startIndex + LIMIT);
      
      if (isAppend) {
        setStudents((prev) => [...prev, ...paginatedData]);
      } else {
        setStudents(paginatedData);
      }
      
      setHasMore(data.length > startIndex + LIMIT);
      setPage(pageNum);
    } catch (err: any) {
      setError(err?.message || "Failed to retrieve student data.");
    } finally {
      setIsLoading(false);
      setIsPageLoading(false);
    }
  }, [institutionId, params.search, params.classId, params.sectionId]);

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchStudents(1, false);
  }, [params.search, params.classId, params.sectionId, fetchStudents]);

  // Load next page
  const handleLoadMore = () => {
    if (!isPageLoading && hasMore) {
      fetchStudents(page + 1, true);
    }
  };

  // Helper to select class
  const handleSelectClass = (classId: string) => {
    setClassModalOpen(false);
    if (role === "teacher" && teacherScopes) {
      const classSecs = teacherScopes.sections[classId] || [];
      const firstSectionId = classSecs.length > 0 ? classSecs[0].id : "";
      router.setParams({ classId, sectionId: firstSectionId });
      setSections(classSecs);
    } else {
      router.setParams({ classId, sectionId: "" });
    }
  };

  // Helper to select section
  const handleSelectSection = (sectionId: string) => {
    setSectionModalOpen(false);
    router.setParams({ sectionId });
  };

  // Render Skeleton Placeholders
  const renderSkeletons = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <View key={idx} className="bg-[#F5F0E8] p-4 rounded-2xl flex-row items-center space-x-4 mb-3 border border-gray-200/50 opacity-60">
        <View className="w-12 h-12 rounded-full bg-gray-300 animate-pulse" />
        <View className="flex-1 space-y-2">
          <View className="h-4 bg-gray-300 w-1/2 rounded animate-pulse" />
          <View className="h-3 bg-gray-300 w-3/4 rounded animate-pulse" />
        </View>
        <View className="w-12 h-6 bg-gray-300 rounded-full animate-pulse" />
      </View>
    ));
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F3E8] justify-center items-center">
        <ActivityIndicator size="large" color="#C9A84C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3E8]">
      <Header title="Students" showBackButton={true} />

      {/* Search and Filters */}
      <View className="px-5 mt-5">
        {/* Search Input */}
        <View className="relative bg-white border border-gray-300/80 rounded-full flex-row items-center px-4 py-2.5 shadow-sm">
          <Ionicons name="search-outline" size={18} color="#75777D" className="mr-2" />
          <TextInput
            className="flex-grow font-inter text-xs text-[#0D1B2A] py-0 outline-none"
            placeholder="Search by name or roll no..."
            placeholderTextColor="#75777D"
            value={searchVal}
            onChangeText={setSearchVal}
          />
          {searchVal.length > 0 && (
            <TouchableOpacity onPress={() => setSearchVal("")}>
              <Ionicons name="close-circle" size={16} color="#75777D" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown Filters */}
        <View className="mt-3 flex-row space-x-3">
          {/* Class Dropdown */}
          <TouchableOpacity
            onPress={() => setClassModalOpen(true)}
            className="flex-1 flex-row items-center justify-between px-4 py-3.5 bg-white border-[1.5px] border-[#C9A84C] rounded-xl shadow-sm"
          >
            <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
              {selectedClass ? selectedClass.name : "Select Class"}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#0D1B2A" />
          </TouchableOpacity>

          {/* Section Dropdown */}
          <TouchableOpacity
            onPress={() => setSectionModalOpen(true)}
            disabled={!params.classId}
            className={`flex-1 flex-row items-center justify-between px-4 py-3.5 bg-white border-[1.5px] border-[#C9A84C] rounded-xl shadow-sm ${
              !params.classId ? "opacity-50" : ""
            }`}
          >
            <Text className="font-poppins-semibold text-xs text-[#0D1B2A]">
              {selectedSection ? `Section ${selectedSection.name}` : "Select Section"}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#0D1B2A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Student List */}
      <View className="flex-1 px-5 mt-5">
        {isLoading ? (
          renderSkeletons()
        ) : error ? (
          <View className="flex-1 justify-center items-center p-5">
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text className="font-poppins-semibold text-sm text-[#0D1B2A] text-center mt-3">{error}</Text>
            <TouchableOpacity
              onPress={() => fetchStudents(1, false)}
              className="mt-4 px-6 py-2.5 bg-[#C9A84C] rounded-xl"
            >
              <Text className="font-poppins-bold text-xs text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : students.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons name="search" size={48} color="#75777D" />
            <Text className="font-poppins-semibold text-sm text-[#0D1B2A] text-center mt-3">No students found</Text>
            <Text className="font-inter text-xs text-[#75777D] text-center mt-1">Try adjusting your filters or search keywords.</Text>
          </View>
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isPageLoading ? (
                <ActivityIndicator size="small" color="#C9A84C" className="my-4" />
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/students/${item.id}` as any)}
                activeOpacity={0.8}
                className="bg-[#F5F0E8] p-4 rounded-2xl flex-row items-center space-x-4 mb-3 border border-gray-200/50 shadow-sm"
              >
                {/* Avatar Initials */}
                <View className="w-12 h-12 rounded-full bg-[#ffe088] flex-row items-center justify-center border border-[#C9A84C]">
                  <Text className="font-poppins-bold text-xs text-[#574500]">
                    {getInitials(item.full_name)}
                  </Text>
                </View>

                {/* Details */}
                <View className="flex-1">
                  <Text className="font-poppins-bold text-sm text-[#0D1B2A]" numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Text className="font-inter text-xs text-[#75777D] mt-0.5">
                    Roll No: {item.roll_number?.split("-")[1] || "—"} | {item.class_name}-{item.section_name}
                  </Text>
                </View>

                {/* AI Score Badge */}
                <View className="flex-row items-center space-x-2">
                  <View className="bg-[#2ABFBF]/10 px-3 py-1 rounded-full border border-[#2ABFBF]/30">
                    <Text className="font-poppins-bold text-[10px] text-[#2ABFBF]">
                      AI: {item.ai_score !== null ? item.ai_score : "—"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={16} color="#75777D" />
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Class Selector Modal */}
      <Modal visible={classModalOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setClassModalOpen(false)}>
          <View className="bg-white rounded-t-3xl max-h-[70%] p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-poppins-bold text-base text-[#0D1B2A]">Select Class</Text>
              <TouchableOpacity onPress={() => setClassModalOpen(false)}>
                <Ionicons name="close" size={24} color="#0D1B2A" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={classes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectClass(item.id)}
                  className={`py-3.5 px-4 rounded-xl mb-2 flex-row justify-between items-center ${
                    params.classId === item.id ? "bg-[#F7F3E8] border border-[#C9A84C]" : "bg-gray-50"
                  }`}
                >
                  <Text className={`font-poppins-semibold text-xs ${
                    params.classId === item.id ? "text-[#C9A84C]" : "text-[#0D1B2A]"
                  }`}>
                    {item.name}
                  </Text>
                  {params.classId === item.id && (
                    <Ionicons name="checkmark" size={16} color="#C9A84C" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Section Selector Modal */}
      <Modal visible={sectionModalOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setSectionModalOpen(false)}>
          <View className="bg-white rounded-t-3xl max-h-[50%] p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-poppins-bold text-base text-[#0D1B2A]">Select Section</Text>
              <TouchableOpacity onPress={() => setSectionModalOpen(false)}>
                <Ionicons name="close" size={24} color="#0D1B2A" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectSection(item.id)}
                  className={`py-3.5 px-4 rounded-xl mb-2 flex-row justify-between items-center ${
                    params.sectionId === item.id ? "bg-[#F7F3E8] border border-[#C9A84C]" : "bg-gray-50"
                  }`}
                >
                  <Text className={`font-poppins-semibold text-xs ${
                    params.sectionId === item.id ? "text-[#C9A84C]" : "text-[#0D1B2A]"
                  }`}>
                    Section {item.name}
                  </Text>
                  {params.sectionId === item.id && (
                    <Ionicons name="checkmark" size={16} color="#C9A84C" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <BottomNavBar activeTab="academics" />
    </SafeAreaView>
  );
}
