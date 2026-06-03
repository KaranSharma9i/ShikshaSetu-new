import React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/student/Header";
import BottomNavBar from "../components/student/BottomNavBar";
import { useStudentFees } from "../hooks/useStudentFees";

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FeesScreen() {
  const router = useRouter();
  const { fees, totalDue, totalPaid, totalPending, isLoading, error, refetch } = useStudentFees();

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F9F6EF" }}>
      {Platform.OS === "android" && <View style={{ height: statusBarHeight }} />}
      
      <Header />
      
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
            <Ionicons name="warning-outline" size={48} color="#EF4444" />
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#111827", textAlign: "center", marginTop: 12 }}>
              Failed to load fees
            </Text>
            <Text style={{ fontFamily: "Inter-Regular", fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 6, marginBottom: 20 }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={refetch}
              style={{ backgroundColor: "#D4AF37", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 100 }}
            >
              <Text style={{ fontFamily: "Poppins-Bold", color: "#0D1B2A", fontSize: 13 }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
              </TouchableOpacity>
              <Text className="font-poppins-bold text-2xl text-[#0D1B2A]">Fees Portal</Text>
            </View>

            {/* Total Balance Card */}
            <View style={{ backgroundColor: "#0D1B2A", borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
              <Text style={{ fontFamily: "Inter-Regular", fontSize: 12, color: "#9CA3AF" }}>Total Outstanding Balance</Text>
              <Text style={{ fontFamily: "Poppins-Bold", fontSize: 32, color: "#FFFFFF", marginTop: 4 }}>
                {formatRupees(totalPending)}
              </Text>
              
              <View style={{ height: 1, backgroundColor: "#FFFFFF15", marginVertical: 16 }} />
              
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontFamily: "Inter-Regular", fontSize: 11, color: "#9CA3AF" }}>Total Expected</Text>
                  <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 15, color: "#FFFFFF", marginTop: 2 }}>
                    {formatRupees(totalDue)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontFamily: "Inter-Regular", fontSize: 11, color: "#9CA3AF" }}>Total Paid</Text>
                  <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 15, color: "#10B981", marginTop: 2 }}>
                    {formatRupees(totalPaid)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Fee Items List */}
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#0D1B2A", marginBottom: 12 }}>Fee Breakdown</Text>
            
            {fees.length === 0 ? (
              <View style={{ backgroundColor: "white", padding: 24, borderRadius: 20, borderWidth: 1, borderColor: "#F3F4F6", borderStyle: "solid", alignItems: "center", justifyContent: "center", height: 160 }}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#1F2937", marginTop: 8 }}>All fees are fully paid!</Text>
                <Text style={{ fontFamily: "Inter-Regular", fontSize: 12, color: "#6B7280", marginTop: 2 }}>No pending payments due.</Text>
              </View>
            ) : (
              fees.map((fee) => {
                const isPaid = fee.status === "paid";
                const isOverdue = fee.status === "overdue";
                
                let badgeBg = "#FEF3C7"; // pending
                let badgeText = "#D97706";
                let statusLabel = "Pending";
                
                if (isPaid) {
                  badgeBg = "#D1FAE5";
                  badgeText = "#059669";
                  statusLabel = "Paid";
                } else if (isOverdue) {
                  badgeBg = "#FEE2E2";
                  badgeText = "#DC2626";
                  statusLabel = "Overdue";
                }

                return (
                  <View
                    key={fee.id}
                    style={{
                      backgroundColor: "white",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: isOverdue ? "#FEE2E2" : "#F3F4F6",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.02,
                      shadowRadius: 3,
                      elevation: 1
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#1F2937" }}>
                          {fee.fee_name}
                        </Text>
                        <Text style={{ fontFamily: "Inter-Regular", fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                          {isPaid 
                            ? `Paid on ${formatDate(fee.payment_date)}`
                            : `Due by ${formatDate(fee.due_date)}`
                          }
                        </Text>
                      </View>
                      
                      <View style={{ backgroundColor: badgeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 10, color: badgeText }}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View>
                        <Text style={{ fontFamily: "Inter-Regular", fontSize: 10, color: "#9CA3AF" }}>Billed Amount</Text>
                        <Text style={{ fontFamily: "Inter-Medium", fontSize: 13, color: "#4B5563", marginTop: 2 }}>
                          {formatRupees(fee.amount)}
                        </Text>
                      </View>
                      
                      {!isPaid && (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontFamily: "Inter-Regular", fontSize: 10, color: "#DC2626" }}>Pending Amount</Text>
                          <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#DC2626", marginTop: 2 }}>
                            {formatRupees(fee.amount - fee.amount_paid)}
                          </Text>
                        </View>
                      )}
                      
                      {isPaid && (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontFamily: "Inter-Regular", fontSize: 10, color: "#059669" }}>Paid Amount</Text>
                          <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#059669", marginTop: 2 }}>
                            {formatRupees(fee.amount_paid)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
      <BottomNavBar />
    </View>
  );
}
