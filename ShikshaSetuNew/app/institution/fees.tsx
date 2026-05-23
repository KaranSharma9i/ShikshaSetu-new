import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { schoolData, FeeDefaulter } from "../../constants/schoolData";

export default function FeesDashboard() {
  const [defaulters, setDefaulters] = useState<FeeDefaulter[]>(schoolData.defaulters);
  const [broadcasting, setBroadcasting] = useState(false);

  const handleSendReminder = (student: FeeDefaulter) => {
    Alert.alert(
      "Fee Reminder Sent",
      `A custom fee reminder notification has been broadcasted to ${student.name}'s registered guardian for the pending amount of ${student.pendingAmount}.`,
      [{ text: "OK" }]
    );
  };

  const handleBroadcastAll = () => {
    setBroadcasting(true);
    setTimeout(() => {
      setBroadcasting(false);
      Alert.alert(
        "Broadcast Success",
        "Fee reminders successfully broadcasted to all outstanding defaulters (3 guardians notified).",
        [{ text: "Great" }]
      );
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <Header title="Finance & Fees" />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Title */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-[11px] font-poppins-semibold text-[#735c00] tracking-widest uppercase mb-1">
            Accounts & Billing
          </Text>
          <Text className="text-2xl font-poppins-bold text-[#0F1C2C] leading-tight">
            Fee Collection
          </Text>
        </View>

        {/* Financial Highlights Panel */}
        <View className="px-5 mb-6">
          <View className="bg-[#0F1C2C] p-5 rounded-3xl border-2 border-[#ffe088]/40 shadow-md">
            <Text className="text-slate-400 font-inter text-[10px] uppercase tracking-wider">
              Total Term Collection (Term 1)
            </Text>
            <Text className="text-white font-poppins-bold text-3xl mt-1">
              ₹14.8 Lakhs
            </Text>
            <View className="w-full bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden">
              <View className="bg-[#ffe088] h-full rounded-full" style={{ width: "85.2%" }} />
            </View>
            <View className="flex-row justify-between items-center mt-3">
              <Text className="text-slate-300 font-inter text-[11px]">
                Target: ₹17.5 Lakhs
              </Text>
              <Text className="text-[#ffe088] font-poppins-bold text-[11px]">
                85.2% Completed
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button: Broadcast all */}
        <View className="px-5 mb-6">
          <TouchableOpacity
            onPress={handleBroadcastAll}
            disabled={broadcasting}
            className="bg-[#ffe088] py-4 rounded-xl items-center flex-row justify-center space-x-2 border border-[#735c00]"
          >
            <Ionicons name="mail-unread-outline" size={18} color="#735c00" />
            <Text className="text-[#735c00] font-poppins-bold text-sm">
              {broadcasting ? "Broadcasting Reminders..." : "Send Reminders to All"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Defaulters Section */}
        <View className="px-5">
          <Text className="text-[#0F1C2C] font-poppins-bold text-base mb-3 px-1">
            Outstanding Defaulters List
          </Text>

          {defaulters.map((student) => (
            <View
              key={student.id}
              className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm mb-4"
            >
              <View className="flex-row justify-between items-start mb-3">
                <View>
                  <Text className="font-poppins-bold text-sm text-[#0F1C2C]">
                    {student.name}
                  </Text>
                  <Text className="text-[10px] text-neutral-steel">
                    {student.className}
                  </Text>
                </View>

                <View
                  className={`px-2 py-0.5 rounded-full ${
                    student.status === "Overdue"
                      ? "bg-rose-50 border border-rose-100"
                      : "bg-amber-50 border border-amber-100"
                  }`}
                >
                  <Text
                    className={`font-poppins-semibold text-[8px] uppercase tracking-wide ${
                      student.status === "Overdue" ? "text-rose-600" : "text-amber-600"
                    }`}
                  >
                    {student.status}
                  </Text>
                </View>
              </View>

              {/* Fee info row */}
              <View className="flex-row justify-between items-center border-t border-gray-50 pt-3">
                <View>
                  <Text className="text-[9px] text-[#778598] font-inter">Pending Amount</Text>
                  <Text className="text-rose-600 font-poppins-bold text-sm">
                    {student.pendingAmount}
                  </Text>
                </View>
                <View>
                  <Text className="text-[9px] text-[#778598] font-inter">Deadline Date</Text>
                  <Text className="text-[#0f1c2c] font-poppins-semibold text-xs">
                    {student.dueDate}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleSendReminder(student)}
                  className="bg-[#0F1C2C] px-3.5 py-2 rounded-xl"
                >
                  <Text className="text-[#ffe088] font-poppins-semibold text-[10px]">
                    Remind
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom navbar navigation active fee */}
      <BottomNavBar activeTab="utilities" />
    </SafeAreaView>
  );
}
