import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { getStudentProfileByUserId } from "@/src/repositories/studentRepository";
import { getStudentFees, StudentFeesData } from "@/src/repositories/feeRepository";

export interface StudentFeesState extends StudentFeesData {
  isLoading: boolean;
  error: string | null;
}

export function useStudentFees() {
  const { userId, isSignedIn, isLoaded, role } = useAuth();
  const [state, setState] = useState<StudentFeesState>({
    fees: [],
    totalDue: 0,
    totalPaid: 0,
    totalPending: 0,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (role && role !== "student") return;
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Resolve studentId
      const studentProfile = await getStudentProfileByUserId(userId);
      if (!studentProfile) {
        setState({
          fees: [],
          totalDue: 0,
          totalPaid: 0,
          totalPending: 0,
          isLoading: false,
          error: "Student profile not found.",
        });
        return;
      }

      // 2. Fetch fees
      const feesData = await getStudentFees(studentProfile.id);

      setState({
        ...feesData,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching student fees:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to load fee information.",
      }));
    }
  }, [userId, role]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchData();
    }
  }, [isLoaded, isSignedIn, userId, fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}
