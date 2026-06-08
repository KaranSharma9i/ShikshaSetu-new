import React, { useState, useEffect, useCallback } from "react";
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
import { getTeacherList, getSubjects } from "@/src/repositories/teacherRepository";
import { TeacherListItem } from "@/src/types/teacher";

export default function TeacherListScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, role, institutionId, theme } = useAuth();
  
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A';
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37';
  const secondaryLightColor = theme?.colors?.secondaryLight ?? '#F2C14E';
  const creamColor = theme?.colors?.cream ?? '#F7F3E8';
  const steelGrayColor = theme?.colors?.steelGray ?? '#6B7280';
  const primaryAltColor = theme?.colors?.primaryAlt ?? '#162A56';
  
  // URL Search Params
  const params = useLocalSearchParams<{ subject?: string; status?: string; search?: string }>();
  
  // Filter and Search States
  const [searchVal, setSearchVal] = useState(params.search || "");
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);

  // List States
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // 2. Fetch Subjects for filter dropdown
  useEffect(() => {
    if (!institutionId) return;
    getSubjects(institutionId)
      .then(setSubjects)
      .catch(err => console.error("Failed to load subjects:", err));
  }, [institutionId]);

  // 3. Debounced Search Parameter Sync
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      router.setParams({ search: searchVal });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchVal]);

  // 4. Fetch Teachers List
  const fetchTeachers = useCallback(async () => {
    if (!institutionId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getTeacherList(institutionId, {
        subject: params.subject,
        status: params.status,
        search: params.search,
      });
      setTeachers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to retrieve teacher data.");
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, params.subject, params.status, params.search]);

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchTeachers();
  }, [params.subject, params.status, params.search, fetchTeachers]);

  // Helper to select subject filter
  const handleSelectSubject = (subjectName: string) => {
    setSubjectModalOpen(false);
    router.setParams({ subject: subjectName === "All Subjects" ? "" : subjectName });
  };

  // Helper to select status filter
  const handleSelectStatus = (status: string) => {
    router.setParams({ status: status === "All" ? "" : status });
  };

  // Render Skeleton Placeholders
  const renderSkeletons = () => {
    return Array.from({ length: 4 }).map((_, idx) => (
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

  // Department Overview stats
  const activeCount = teachers.filter(t => t.status === "Active").length;
  const totalCount = teachers.length;
  const avgPerf = teachers.length > 0
    ? Math.round(teachers.reduce((acc, t) => acc + t.performanceScore, 0) / teachers.length)
    : 81;

  if (!isLoaded || !isSignedIn) {
    return (
      <SafeAreaView className="flex-grow flex-1 justify-center items-center" style={{ backgroundColor: creamColor }}>
        <ActivityIndicator size="large" color={secondaryColor} />
      </SafeAreaView>
    );
  }

  const selectedSubject = params.subject || "";
  const selectedStatus = params.status || "All";

  return (
    <SafeAreaView className="flex-grow flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="Teachers" showBackButton={true} />

      {/* Search and Filters */}
      <View className="px-5 mt-5">
        {/* Search Input */}
        <View className="relative bg-white border border-gray-300/80 rounded-full flex-row items-center px-4 py-2.5 shadow-sm">
          <Ionicons name="search-outline" size={18} color={steelGrayColor} className="mr-2" />
          <TextInput
            className="flex-grow font-inter text-xs py-0 outline-none"
            style={{ color: primaryColor }}
            placeholder="Search by name or subject..."
            placeholderTextColor={steelGrayColor}
            value={searchVal}
            onChangeText={setSearchVal}
          />
          {searchVal.length > 0 && (
            <TouchableOpacity onPress={() => setSearchVal("")}>
              <Ionicons name="close-circle" size={16} color={steelGrayColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown & Chip Filters */}
        <View className="mt-3 flex-row space-x-3 items-center">
          {/* Subject Dropdown Filter */}
          <TouchableOpacity
            onPress={() => setSubjectModalOpen(true)}
            className="flex-1 flex-row items-center justify-between px-4 py-3 bg-white border-[1.5px] rounded-xl shadow-sm"
            style={{ borderColor: secondaryColor }}
          >
            <Text className="font-poppins-semibold text-xs" style={{ color: primaryColor }} numberOfLines={1}>
              {selectedSubject ? selectedSubject : "All Subjects"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={primaryColor} />
          </TouchableOpacity>

          {/* Status Selection Chips */}
          <View className="flex-row bg-white border border-gray-200 p-1 rounded-xl shadow-sm space-x-1">
            {["All", "Active", "Inactive"].map((statusOpt) => (
              <TouchableOpacity
                key={statusOpt}
                onPress={() => handleSelectStatus(statusOpt)}
                className="px-3 py-1.5 rounded-lg"
                style={selectedStatus === statusOpt ? { backgroundColor: secondaryColor } : undefined}
              >
                <Text
                  className="font-poppins-semibold text-[10px] uppercase tracking-wider"
                  style={{ color: selectedStatus === statusOpt ? "#FFFFFF" : steelGrayColor }}
                >
                  {statusOpt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Main Teacher List */}
      <View className="flex-1 px-5 mt-5">
        {isLoading ? (
          renderSkeletons()
        ) : error ? (
          <View className="flex-1 justify-center items-center p-5">
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text className="font-poppins-semibold text-sm text-center mt-3" style={{ color: primaryColor }}>{error}</Text>
            <TouchableOpacity
              onPress={fetchTeachers}
              className="mt-4 px-6 py-2.5 rounded-xl"
              style={{ backgroundColor: secondaryColor }}
            >
              <Text className="font-poppins-bold text-xs text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : teachers.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons name="search" size={48} color={steelGrayColor} />
            <Text className="font-poppins-semibold text-sm text-center mt-3" style={{ color: primaryColor }}>No teachers found</Text>
            <Text className="font-inter text-xs text-center mt-1" style={{ color: steelGrayColor }}>Try adjusting your filters or search keywords.</Text>
          </View>
        ) : (
          <FlatList
            data={teachers}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/teachers/${item.id}` as any)}
                activeOpacity={0.8}
                className="p-4 rounded-2xl flex-row items-center space-x-4 mb-3 border border-gray-200/50 shadow-sm"
                style={{ backgroundColor: "#F5F0E8" }}
              >
                {/* Avatar Initials */}
                <View className="w-12 h-12 rounded-full flex-row items-center justify-center border" style={{ backgroundColor: secondaryLightColor, borderColor: secondaryColor }}>
                  <Text className="font-poppins-bold text-xs" style={{ color: primaryColor }}>
                    {getInitials(item.full_name)}
                  </Text>
                </View>

                {/* Details */}
                <View className="flex-1">
                  <View className="flex-row items-center space-x-1.5">
                    <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }} numberOfLines={1}>
                      {item.full_name}
                    </Text>
                    {/* Status Dot */}
                    <View className={`w-2 h-2 rounded-full ${
                      item.status === "Active" ? "bg-emerald-600" : "bg-neutral-400"
                    }`} />
                  </View>
                  <Text className="font-inter text-[11px] mt-0.5" style={{ color: steelGrayColor }}>
                    Code: {item.employee_code} | {item.specialization}
                  </Text>
                  
                  {/* Classes List */}
                  {item.assigned_classes.length > 0 && (
                    <Text className="font-inter text-[10px] text-gray-500 mt-1" numberOfLines={1}>
                      Classes: {item.assigned_classes.join(", ")}
                    </Text>
                  )}
                </View>

                {/* Performance Score Badge */}
                <View className="flex-row items-center space-x-2">
                  <View className="px-2.5 py-1 rounded-full border" style={{ backgroundColor: primaryAltColor + "1A", borderColor: primaryAltColor + "4D" }}>
                    <Text className="font-poppins-bold text-[10px]" style={{ color: primaryAltColor }}>
                      Perf: {item.performanceScore}%
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={16} color={steelGrayColor} />
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Department Overview Sticky Card at Bottom */}
      {!isLoading && teachers.length > 0 && (
        <View className="absolute bottom-[65px] left-0 right-0 px-5 bg-transparent pointer-events-none">
          <View className="rounded-2xl p-4 flex-row justify-between items-center border border-gray-800 shadow-lg pointer-events-auto" style={{ backgroundColor: primaryColor }}>
            <View>
              <Text className="font-poppins-bold text-[10px] uppercase tracking-widest" style={{ color: secondaryLightColor }}>
                Department Overview
              </Text>
              <Text className="font-inter text-[9.5px] text-gray-400 mt-0.5">
                Calculated metrics for filtered staff
              </Text>
            </View>
            <View className="flex-row space-x-6">
              <View className="items-end">
                <Text className="font-poppins-bold text-xs text-white">
                  {avgPerf}%
                </Text>
                <Text className="font-inter text-[8px] text-gray-400 uppercase">
                  Avg Perf
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-poppins-bold text-xs" style={{ color: secondaryLightColor }}>
                  {activeCount}/{totalCount}
                </Text>
                <Text className="font-inter text-[8px] text-gray-400 uppercase">
                  Active Staff
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Subject Filter Selector Modal */}
      <Modal visible={subjectModalOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setSubjectModalOpen(false)}>
          <View className="bg-white rounded-t-3xl max-h-[70%] p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>Select Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModalOpen(false)}>
                <Ionicons name="close" size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: "all", name: "All Subjects" }, ...subjects]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedSubject === item.name || (item.name === "All Subjects" && !selectedSubject);
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectSubject(item.name)}
                    className="py-3.5 px-4 rounded-xl mb-2 flex-row justify-between items-center bg-gray-50"
                    style={isSelected ? { backgroundColor: creamColor, borderWidth: 1, borderColor: secondaryColor } : undefined}
                  >
                    <Text className="font-poppins-semibold text-xs" style={{ color: isSelected ? secondaryColor : primaryColor }}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={secondaryColor} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>

      <BottomNavBar activeTab="academics" />
    </SafeAreaView>
  );
}
