import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { schoolData, Circular } from "../../constants/schoolData";

export default function CircularsHub() {
  const [circulars, setCirculars] = useState<Circular[]>(schoolData.circulars);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"Announcement" | "Urgent" | "Event" | "Holiday">("Announcement");
  const [audience, setAudience] = useState<"All" | "Students" | "Teachers" | "Parents">("All");

  const handleBroadcast = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Input Required", "Please enter both a title and details for the notice.");
      return;
    }

    const newCircular: Circular = {
      id: String(circulars.length + 1),
      title: title.trim(),
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      category,
      body: body.trim(),
      audience,
    };

    setCirculars([newCircular, ...circulars]);
    setTitle("");
    setBody("");
    
    Alert.alert(
      "Notice Broadcasted",
      `The notice titled "${newCircular.title}" has been successfully sent to ${newCircular.audience}.`,
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <Header title="Circular Composer" />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Title */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-[11px] font-poppins-semibold text-[#735c00] tracking-widest uppercase mb-1">
            Communication Board
          </Text>
          <Text className="text-2xl font-poppins-bold text-[#0F1C2C] leading-tight">
            Circular Broadcast
          </Text>
        </View>

        {/* Composer Form Card */}
        <View className="px-5 mb-6">
          <View className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <Text className="text-[#0F1C2C] font-poppins-bold text-sm mb-4">
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
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
            />

            {/* Selector - Category */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5 ml-1">
              Category Tag
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(["Announcement", "Urgent", "Event", "Holiday"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg border ${
                    category === cat
                      ? "bg-[#0F1C2C] border-[#0F1C2C]"
                      : "bg-[#FCFAFA] border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-poppins-semibold ${
                      category === cat ? "text-[#ffe088]" : "text-neutral-steel"
                    }`}
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
                  onPress={() => setAudience(aud)}
                  className={`flex-1 py-2 rounded-lg border items-center ${
                    audience === aud
                      ? "bg-[#0F1C2C] border-[#0F1C2C]"
                      : "bg-[#FCFAFA] border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-poppins-semibold ${
                      audience === aud ? "text-[#ffe088]" : "text-neutral-steel"
                    }`}
                  >
                    {aud}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
              style={{ minHeight: 80 }}
            />

            {/* Broadcast Button */}
            <TouchableOpacity
              onPress={handleBroadcast}
              className="bg-[#0F1C2C] py-4 rounded-xl items-center flex-row justify-center space-x-2 shadow-sm active:opacity-90"
            >
              <Ionicons name="send-outline" size={16} color="#ffe088" />
              <Text className="text-[#ffe088] font-poppins-bold text-xs">
                Broadcast Notice
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* History Feed */}
        <View className="px-5">
          <Text className="text-[#0F1C2C] font-poppins-bold text-base mb-3 px-1">
            Recent Broadcast Feed
          </Text>

          {circulars.map((circ) => (
            <View
              key={circ.id}
              className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm mb-4"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-row items-center space-x-2">
                  <View
                    className={`w-2.5 h-2.5 rounded-full ${
                      circ.category === "Urgent"
                        ? "bg-rose-500"
                        : circ.category === "Event"
                        ? "bg-[#735c00]"
                        : circ.category === "Holiday"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
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

              <Text className="font-poppins-bold text-sm text-[#0F1C2C] mb-1">
                {circ.title}
              </Text>
              <Text className="text-[11px] text-neutral-steel leading-relaxed font-inter">
                {circ.body}
              </Text>
              <Text className="text-[8px] text-[#778598] font-inter mt-3 text-right">
                Sent: {circ.date}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="circulars" />
    </SafeAreaView>
  );
}
