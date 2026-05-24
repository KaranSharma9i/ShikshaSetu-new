import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { schoolData, CalendarEvent } from "../../constants/schoolData";

interface CustomEvent extends CalendarEvent {
  status: "Upcoming" | "Draft" | "Published";
}

export default function EventsHub() {
  const initialEvents: CustomEvent[] = schoolData.events.map((ev, idx) => ({
    ...ev,
    status: idx === 1 ? "Published" : "Upcoming", // Mock some initial statuses
  }));

  const [events, setEvents] = useState<CustomEvent[]>(initialEvents);
  const [activeFilter, setActiveFilter] = useState<"Upcoming" | "Draft" | "Published">("Upcoming");
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<"Achievement" | "Leadership" | "Excellence" | "Social">("Achievement");

  const filteredEvents = events.filter((ev) => ev.status === activeFilter);

  const handlePublishNow = (event: CustomEvent) => {
    const updatedEvents = events.map((ev) =>
      ev.id === event.id ? { ...ev, status: "Published" as const } : ev
    );
    setEvents(updatedEvents);
    Alert.alert("Event Published", `"${event.title}" is now visible to all students and parents.`);
  };

  const handleScheduleNotifications = (event: CustomEvent) => {
    Alert.alert(
      "Notifications Scheduled",
      `Automatic push notifications and email reminders scheduled for "${event.title}" 24 hours prior.`
    );
  };

  const handleAddEventSubmit = () => {
    if (!title.trim() || !date.trim() || !location.trim()) {
      Alert.alert("Input Required", "Please enter Event Title, Date, and Location.");
      return;
    }

    const newEvent: CustomEvent = {
      id: String(events.length + 1),
      title: title.trim(),
      date: date.trim(),
      time: time.trim() || "09:00 AM",
      location: location.trim(),
      category,
      status: "Upcoming", // Newly scheduled events default to Upcoming
    };

    setEvents([newEvent, ...events]);
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    setCategory("Achievement");
    setModalVisible(false);

    Alert.alert(
      "Event Scheduled",
      `The event "${newEvent.title}" has been successfully scheduled and added to Upcoming.`
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDF9F1]">
      <Header title="Events Board" />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Title Block */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-[11px] font-poppins-semibold text-[#735c00] tracking-widest uppercase mb-1">
            Institutional Calendar
          </Text>
          <Text className="text-2xl font-poppins-bold text-[#0F1C2C] leading-tight">
            Events Hub
          </Text>
        </View>

        {/* Filter Tabs */}
        <View className="px-5 mb-5 mt-2">
          <View className="flex-row bg-[#FCFAFA] border border-gray-200/80 p-1 rounded-xl">
            {(["Upcoming", "Draft", "Published"] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`flex-1 py-2.5 rounded-lg items-center ${
                  activeFilter === filter ? "bg-[#0F1C2C]" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-poppins-bold ${
                    activeFilter === filter ? "text-[#ffe088]" : "text-neutral-steel"
                  }`}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Events Stack */}
        <View className="px-5">
          {filteredEvents.length === 0 ? (
            <View className="bg-white border border-gray-200/60 p-8 rounded-2xl items-center justify-center">
              <Ionicons name="calendar-outline" size={32} color="#778598" />
              <Text className="text-neutral-steel font-poppins-medium text-xs mt-3">
                No events in "{activeFilter}" tab.
              </Text>
            </View>
          ) : (
            filteredEvents.map((ev) => (
              <View
                key={ev.id}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden mb-4"
              >
                <View className="p-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center">
                      {ev.status !== "Published" && (
                        <View className="w-1.5 h-6 bg-[#735c00] rounded-full mr-2" />
                      )}
                      <View>
                        <Text className="font-poppins-bold text-sm text-[#0F1C2C]">
                          {ev.title}
                        </Text>
                        <Text className="text-[9px] text-[#735c00] font-poppins-semibold uppercase tracking-wider mt-0.5">
                          {ev.category}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="bg-[#0F1C2C]/5 px-2 py-0.5 rounded">
                      <Text className="text-[#0F1C2C] font-inter text-[8px] font-bold">
                        {ev.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View className="space-y-1.5 mt-3">
                    <View className="flex-row items-center space-x-2">
                      <Ionicons name="calendar-outline" size={13} color="#735c00" />
                      <Text className="font-inter text-[11px] text-neutral-charcoal">
                        {ev.date} • {ev.time}
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <Ionicons name="location-outline" size={13} color="#735c00" />
                      <Text className="font-inter text-[11px] text-neutral-charcoal">
                        {ev.location}
                      </Text>
                    </View>
                  </View>

                  {/* Actions footer inside Card */}
                  <View className="mt-4 border-t border-gray-100 pt-3 flex-row space-x-2">
                    {ev.status === "Upcoming" && (
                      <>
                        <TouchableOpacity
                          onPress={() => handlePublishNow(ev)}
                          className="flex-1 bg-[#0F1C2C] py-2.5 rounded-xl items-center"
                        >
                          <Text className="text-[#ffe088] font-poppins-bold text-[10px]">
                            Publish Now
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleScheduleNotifications(ev)}
                          className="px-3 border border-gray-200 rounded-xl justify-center items-center"
                        >
                          <Ionicons name="notifications-outline" size={14} color="#735c00" />
                        </TouchableOpacity>
                      </>
                    )}
                    {ev.status === "Published" && (
                      <TouchableOpacity
                        onPress={() => handleScheduleNotifications(ev)}
                        className="flex-1 border border-[#735c00]/50 py-2.5 rounded-xl items-center flex-row justify-center space-x-1"
                      >
                        <Ionicons name="notifications-outline" size={12} color="#735c00" />
                        <Text className="text-[#735c00] font-poppins-bold text-[10px]">
                          Notify Attendees
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) for adding new events */}
      <View className="absolute bottom-24 left-0 right-0 items-center">
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="flex-row items-center space-x-2 bg-[#0F1C2C] px-8 py-3.5 rounded-full shadow-lg border border-gray-800"
        >
          <Ionicons name="add" size={18} color="#ffe088" />
          <Text className="text-[#ffe088] font-poppins-bold text-xs">
            Add New Event
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Composer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-6 border-t border-gray-200">
            <View className="flex-row justify-between items-center mb-5">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-1 rounded-full bg-slate-100"
              >
                <Ionicons name="close" size={18} color="#0F1C2C" />
              </TouchableOpacity>
              <Text className="font-poppins-bold text-base text-[#0F1C2C]">
                Schedule Academic Event
              </Text>
              <View className="w-6" />
            </View>

            {/* Inputs */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5">
              Event Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Annual Sports Meet"
              placeholderTextColor="#9CA3AF"
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
            />

            <View className="flex-row space-x-3 mb-4">
              <View className="flex-1">
                <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5">
                  Date
                </Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="e.g. Oct 24, 2026"
                  placeholderTextColor="#9CA3AF"
                  className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl font-inter text-xs text-[#0F1C2C]"
                />
              </View>
              <View className="flex-1">
                <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5">
                  Time
                </Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="e.g. 08:00 AM"
                  placeholderTextColor="#9CA3AF"
                  className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl font-inter text-xs text-[#0F1C2C]"
                />
              </View>
            </View>

            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5">
              Location / Venue
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Main Athletic Arena"
              placeholderTextColor="#9CA3AF"
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs text-[#0F1C2C]"
            />

            {/* Category Select */}
            <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5">
              Event Category
            </Text>
            <View className="flex-row gap-2 mb-6">
              {(["Achievement", "Leadership", "Excellence", "Social"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`flex-1 py-2 rounded-lg border items-center ${
                    category === cat ? "bg-[#0F1C2C] border-[#0F1C2C]" : "bg-[#FCFAFA] border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[9px] font-poppins-semibold ${
                      category === cat ? "text-[#ffe088]" : "text-neutral-steel"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleAddEventSubmit}
              className="bg-[#0F1C2C] py-4 rounded-xl items-center flex-row justify-center space-x-2"
            >
              <Ionicons name="calendar-outline" size={16} color="#ffe088" />
              <Text className="text-[#ffe088] font-poppins-bold text-xs">
                Schedule Event
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavBar activeTab="utilities" />
    </SafeAreaView>
  );
}
