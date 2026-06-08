import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { schoolData, Circular } from "../../constants/schoolData";
import { useAuth } from "../../src/hooks/useAuth";
import { useQuery } from "../../src/hooks/useQuery";
import { getCirculars, createCircular } from "../../src/repositories/circularRepository";
import { getClasses } from "../../src/repositories/studentRepository";
import { handleError } from "../../src/utils/error";

export default function CircularsHub() {
  const { institutionId, userId, theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#F2C14E";
  const creamColor = theme?.colors?.cream ?? "#F5F0E8";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"Announcement" | "Urgent">("Announcement");
  const [audience, setAudience] = useState<"All" | "Students" | "Teachers" | "Parents">("All");
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: dbCirculars, isLoading, refetch } = useQuery(
    () => getCirculars(institutionId || ""),
    [institutionId]
  );

  const { data: classesData } = useQuery(
    () => getClasses(institutionId || ""),
    [institutionId]
  );
  
  const [circulars, setCirculars] = useState<Circular[]>([]);

  useEffect(() => {
    if (dbCirculars) {
      setCirculars(dbCirculars);
    }
  }, [dbCirculars]);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Input Required", "Please enter both a title and details for the notice.");
      return;
    }

    setIsSubmitting(true);
    try {
      let targetRoles: string[] = ['institution_admin', 'teacher', 'student', 'driver'];
      if (audience === "Students") {
        targetRoles = ["student"];
      } else if (audience === "Teachers") {
        targetRoles = ["teacher"];
      } else if (audience === "Parents") {
        targetRoles = ["parent"];
      }

      const newCircular = await createCircular(
        institutionId || "",
        title.trim(),
        body.trim(),
        userId,
        category,
        targetRoles,
        audience === "Students" ? targetClassId : null
      );

      setCirculars([newCircular, ...circulars]);
      setTitle("");
      setBody("");
      setTargetClassId(null);
      
      Alert.alert(
        "Notice Broadcasted",
        `The notice titled "${newCircular.title}" has been successfully sent to ${newCircular.audience}.`,
        [{ text: "OK" }]
      );
    } catch (err: any) {
      handleError(err, "Notice Broadcast Failed");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="Circular Composer" />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Title */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-[11px] font-poppins-semibold tracking-widest uppercase mb-1" style={{ color: secondaryColor }}>
            Communication Board
          </Text>
          <Text className="text-2xl font-poppins-bold leading-tight" style={{ color: primaryColor }}>
            Circular Broadcast
          </Text>
        </View>

        {/* Composer Form Card */}
        <View className="px-5 mb-6">
          <View className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <Text className="font-poppins-bold text-sm mb-4" style={{ color: primaryColor }}>
              Compose New Notice
            </Text>

            {/* Input - Title */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Notice Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Science Fair Registration Open"
              placeholderTextColor="#9CA3AF"
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs"
              style={{ color: primaryColor }}
            />

            {/* Selector - Category */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Category Tag
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(["Announcement", "Urgent"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className="px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: category === cat ? primaryColor : "#FCFAFA",
                    borderColor: category === cat ? primaryColor : "#E5E7EB"
                  }}
                >
                  <Text
                    className="text-[10px] font-poppins-semibold"
                    style={{
                      color: category === cat ? secondaryColor : "#75777D"
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selector - Audience */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Target Audience
            </Text>
            <View className="flex-row gap-2 mb-4">
              {(["All", "Students", "Teachers"] as const).map((aud) => (
                <TouchableOpacity
                  key={aud}
                  onPress={() => {
                    setAudience(aud);
                    if (aud !== "Students") {
                      setTargetClassId(null);
                      setClassPickerOpen(false);
                    }
                  }}
                  className="flex-1 py-2 rounded-lg border items-center"
                  style={{
                    backgroundColor: audience === aud ? primaryColor : "#FCFAFA",
                    borderColor: audience === aud ? primaryColor : "#E5E7EB"
                  }}
                >
                  <Text
                    className="text-[10px] font-poppins-semibold"
                    style={{
                      color: audience === aud ? secondaryColor : "#75777D"
                    }}
                  >
                    {aud}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Target Class Dropdown (only when Students is selected) */}
            {audience === "Students" && (
              <View className="mb-4">
                <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
                  Target Class
                </Text>
                <TouchableOpacity
                  onPress={() => setClassPickerOpen(!classPickerOpen)}
                  className="flex-row items-center justify-between px-4 py-3 bg-[#FCFAFA] border border-gray-200 rounded-xl"
                >
                  <Text className="font-inter text-xs" style={{ color: primaryColor }}>
                    {targetClassId && classesData
                      ? (classesData.find(c => c.id === targetClassId)?.name || "All Classes")
                      : "All Classes"}
                  </Text>
                  <Ionicons name={classPickerOpen ? "chevron-up" : "chevron-down"} size={14} color={primaryColor} />
                </TouchableOpacity>

                {classPickerOpen && (
                  <View className="max-h-[160px] border border-gray-200 bg-white rounded-xl mt-1.5 overflow-hidden shadow-sm">
                    <ScrollView nestedScrollEnabled>
                      <TouchableOpacity
                        onPress={() => {
                          setTargetClassId(null);
                          setClassPickerOpen(false);
                        }}
                        style={{ backgroundColor: targetClassId === null ? `${secondaryColor}15` : "transparent" }}
                        className="py-2.5 px-4 border-b border-gray-100 last:border-b-0"
                      >
                        <Text className="font-inter text-xs" style={{ color: primaryColor }}>
                          All Classes
                        </Text>
                      </TouchableOpacity>
                      {classesData?.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            setTargetClassId(item.id);
                            setClassPickerOpen(false);
                          }}
                          style={{ backgroundColor: targetClassId === item.id ? `${secondaryColor}15` : "transparent" }}
                          className="py-2.5 px-4 border-b border-gray-100 last:border-b-0"
                        >
                          <Text className="font-inter text-xs" style={{ color: primaryColor }}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Input - Body Details */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Notice Details
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Provide complete description of notice..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs"
              style={{ minHeight: 80, color: primaryColor }}
            />

            {/* Broadcast Button */}
            <TouchableOpacity
              onPress={handleBroadcast}
              disabled={isSubmitting}
              className="py-4 rounded-xl items-center flex-row justify-center space-x-2 shadow-sm active:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={secondaryColor} />
              ) : (
                <>
                  <Ionicons name="send-outline" size={16} color={secondaryColor} />
                  <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                    Broadcast Notice
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* History Feed */}
        <View className="px-5">
          <Text className="font-poppins-bold text-base mb-3 px-1" style={{ color: primaryColor }}>
            Recent Broadcast Feed
          </Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={secondaryColor} className="my-10" />
          ) : circulars.length === 0 ? (
            <Text className="text-center text-xs text-neutral-steel font-inter italic my-10">No circulars broadcasted yet.</Text>
          ) : (
            circulars.map((circ) => (
              <View
                key={circ.id}
                className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm mb-4"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-row items-center space-x-2">
                    <View
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: circ.category === "Urgent"
                          ? dangerColor
                          : circ.category === "Event"
                          ? secondaryColor
                          : circ.category === "Holiday"
                          ? "#F59E0B"
                          : "#3B82F6"
                      }}
                    />
                    <Text className="text-[10px] font-poppins-bold text-neutral-steel uppercase">
                      {circ.category}
                    </Text>
                  </View>

                  <View className="bg-slate-100 px-2 py-0.5 rounded">
                    <Text className="text-slate-600 font-inter text-[8px] font-semibold">
                      FOR: {circ.audience.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text className="font-poppins-bold text-sm mb-1" style={{ color: primaryColor }}>
                  {circ.title}
                </Text>
                <Text className="text-[11px] text-neutral-steel leading-relaxed font-inter">
                  {circ.body}
                </Text>
                <Text className="text-[8px] text-[#778598] font-inter mt-3 text-right">
                  Sent: {circ.date}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="circulars" />
    </SafeAreaView>
  );
}
