import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../../components/institution/Header";
import BottomNavBar from "../../components/institution/BottomNavBar";
import { CalendarEvent } from "../../constants/schoolData";
import { useAuth } from "../../src/hooks/useAuth";
import { useQuery } from "../../src/hooks/useQuery";
import { getEvents, createEvent, updateEventStatus } from "../../src/repositories/eventRepository";
import { handleError } from "../../src/utils/error";

interface CustomEvent extends CalendarEvent {
  status: "Upcoming" | "Draft" | "Published";
}

export default function EventsHub() {
  const { institutionId, theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? "#0D1B2A";
  const secondaryColor = theme?.colors?.secondary ?? "#D4AF37";
  const secondaryLightColor = theme?.colors?.secondaryLight ?? "#F2C14E";
  const creamColor = theme?.colors?.cream ?? "#F5F0E8";
  const dangerColor = theme?.colors?.danger ?? "#EF4444";
  
  const { data: dbEvents, isLoading, refetch } = useQuery(
    () => getEvents(institutionId || ""),
    [institutionId]
  );

  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState<"Upcoming" | "Draft" | "Published">("Upcoming");
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [eventTime, setEventTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<"Achievement" | "Leadership" | "Excellence" | "Social">("Achievement");

  const formatDisplayDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`; // DD-MM-YYYY
  };

  const formatDisplayTime = (t: Date) => {
    let hours = t.getHours();
    const minutes = String(t.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, "0");
    return `${hoursStr}:${minutes} ${ampm}`; // HH:MM AM/PM
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setEventTime(selectedTime);
    }
  };

  useEffect(() => {
    if (dbEvents) {
      setEvents(
        dbEvents.map((ev: any) => {
          let status: "Upcoming" | "Draft" | "Published" = "Upcoming";
          if (ev.status === "published") {
            status = "Published";
          } else if (ev.status === "draft") {
            status = "Draft";
          } else {
            status = "Upcoming";
          }
          return {
            ...ev,
            status,
          };
        })
      );
    }
  }, [dbEvents]);

  const filteredEvents = events.filter((ev) => ev.status === activeFilter);

  const handlePublishNow = async (event: CustomEvent) => {
    try {
      const success = await updateEventStatus(event.id, "published");
      if (success) {
        const updatedEvents = events.map((ev) =>
          ev.id === event.id ? { ...ev, status: "Published" as const } : ev
        );
        setEvents(updatedEvents);
        Alert.alert("Event Published", `"${event.title}" is now visible to all students and parents.`);
      } else {
        Alert.alert("Error", "Failed to update status on server.");
      }
    } catch (err: any) {
      handleError(err, "Publishing Event Failed");
    }
  };

  const handleScheduleNotifications = (event: CustomEvent) => {
    Alert.alert(
      "Notifications Scheduled",
      `Automatic push notifications and email reminders scheduled for "${event.title}" 24 hours prior.`
    );
  };

  const handleAddEventSubmit = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert("Input Required", "Please enter Event Title and Location.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newEv = await createEvent(
        institutionId || "",
        title.trim(),
        formatDisplayDate(eventDate),
        formatDisplayTime(eventTime),
        location.trim(),
        category
      );

      const customNewEv: CustomEvent = {
        ...newEv,
        status: "Upcoming"
      };

      setEvents([customNewEv, ...events]);
      setTitle("");
      setEventDate(new Date());
      setEventTime(new Date());
      setLocation("");
      setCategory("Achievement");
      setModalVisible(false);

      Alert.alert(
        "Event Scheduled",
        `The event "${newEv.title}" has been successfully scheduled and added to Upcoming.`
      );
    } catch (err: any) {
      handleError(err, "Event Scheduling Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: creamColor }}>
      <Header title="Events Board" />

      <ScrollView
        className="flex-grow"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Title Block */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-[11px] font-poppins-semibold tracking-widest uppercase mb-1" style={{ color: secondaryColor }}>
            Institutional Calendar
          </Text>
          <Text className="text-2xl font-poppins-bold leading-tight" style={{ color: primaryColor }}>
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
                className="flex-1 py-2.5 rounded-lg items-center"
                style={{ backgroundColor: activeFilter === filter ? primaryColor : "transparent" }}
              >
                <Text
                  className="text-xs font-poppins-bold"
                  style={{ color: activeFilter === filter ? secondaryColor : "#75777D" }}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Events Stack */}
        <View className="px-5">
          {isLoading ? (
            <ActivityIndicator size="small" color={secondaryColor} className="my-10" />
          ) : filteredEvents.length === 0 ? (
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
                        <View className="w-1.5 h-6 rounded-full mr-2" style={{ backgroundColor: secondaryColor }} />
                      )}
                      <View>
                        <Text className="font-poppins-bold text-sm" style={{ color: primaryColor }}>
                          {ev.title}
                        </Text>
                        <Text className="text-[9px] font-poppins-semibold uppercase tracking-wider mt-0.5" style={{ color: secondaryColor }}>
                          {ev.category}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{ backgroundColor: `${primaryColor}0D` }} className="px-2 py-0.5 rounded">
                      <Text className="font-inter text-[8px] font-bold" style={{ color: primaryColor }}>
                        {ev.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View className="space-y-1.5 mt-3">
                    <View className="flex-row items-center space-x-2">
                      <Ionicons name="calendar-outline" size={13} color={secondaryColor} />
                      <Text className="font-inter text-[11px] text-neutral-charcoal">
                        {ev.date} • {ev.time}
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <Ionicons name="location-outline" size={13} color={secondaryColor} />
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
                          className="flex-1 py-2.5 rounded-xl items-center"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Text className="font-poppins-bold text-[10px]" style={{ color: secondaryColor }}>
                            Publish Now
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleScheduleNotifications(ev)}
                          className="px-3 border border-gray-200 rounded-xl justify-center items-center"
                        >
                          <Ionicons name="notifications-outline" size={14} color={secondaryColor} />
                        </TouchableOpacity>
                      </>
                    )}
                    {ev.status === "Published" && (
                      <TouchableOpacity
                        onPress={() => handleScheduleNotifications(ev)}
                        className="flex-1 border py-2.5 rounded-xl items-center flex-row justify-center space-x-1"
                        style={{ borderColor: `${secondaryColor}80` }}
                      >
                        <Ionicons name="notifications-outline" size={12} color={secondaryColor} />
                        <Text className="font-poppins-bold text-[10px]" style={{ color: secondaryColor }}>
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
          className="flex-row items-center space-x-2 px-8 py-3.5 rounded-full shadow-lg border"
          style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
        >
          <Ionicons name="add" size={18} color={secondaryColor} />
          <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
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
                <Ionicons name="close" size={18} color={primaryColor} />
              </TouchableOpacity>
              <Text className="font-poppins-bold text-base" style={{ color: primaryColor }}>
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
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs"
              style={{ color: primaryColor }}
            />

            <View className="flex-row space-x-3 mb-4">
              <View className="flex-1">
                <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5">
                  Date
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl font-inter text-xs h-[44px] justify-center"
                >
                  <Text className="font-inter text-xs" style={{ color: primaryColor }}>
                    {formatDisplayDate(eventDate)}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-poppins-semibold text-neutral-charcoal text-xs mb-1.5">
                  Time
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl font-inter text-xs h-[44px] justify-center"
                >
                  <Text className="font-inter text-xs" style={{ color: primaryColor }}>
                    {formatDisplayTime(eventTime)}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={eventTime}
                    mode="time"
                    display="default"
                    is24Hour={false}
                    onChange={handleTimeChange}
                  />
                )}
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
              className="bg-[#FCFAFA] border border-gray-200 px-4 py-3 rounded-xl mb-4 font-inter text-xs"
              style={{ color: primaryColor }}
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
                  className="flex-1 py-2 rounded-lg border items-center"
                  style={{
                    backgroundColor: category === cat ? primaryColor : "#FCFAFA",
                    borderColor: category === cat ? primaryColor : "#E5E7EB"
                  }}
                >
                  <Text
                    className="text-[9px] font-poppins-semibold"
                    style={{
                      color: category === cat ? secondaryColor : "#75777D"
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleAddEventSubmit}
              disabled={isSubmitting}
              className="py-4 rounded-xl items-center flex-row justify-center space-x-2 active:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={secondaryColor} />
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={16} color={secondaryColor} />
                  <Text className="font-poppins-bold text-xs" style={{ color: secondaryColor }}>
                    Schedule Event
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavBar activeTab="utilities" />
    </SafeAreaView>
  );
}
