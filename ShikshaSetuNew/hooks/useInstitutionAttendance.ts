import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { getInstitutionAttendance, ClassAttendanceBreakdown } from "@/src/repositories/attendanceRepository";

export interface InstitutionAttendanceState {
  selectedDate: string; // Format: 'YYYY-MM-DD'
  breakdown: ClassAttendanceBreakdown[];
  isLoading: boolean;
  error: string | null;
}

export function useInstitutionAttendance(initialDate?: string) {
  const { institutionId, isSignedIn, isLoaded, role } = useAuth();
  
  // Default to today in YYYY-MM-DD local format
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [state, setState] = useState<InstitutionAttendanceState>({
    selectedDate: initialDate || getTodayStr(),
    breakdown: [],
    isLoading: true,
    error: null,
  });

  const setDate = (date: string) => {
    setState(prev => ({ ...prev, selectedDate: date }));
  };

  const fetchData = useCallback(async (date: string) => {
    if (role && role !== "institution_admin") return;
    if (!institutionId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const breakdownData = await getInstitutionAttendance(institutionId, date);
      setState(prev => ({
        ...prev,
        breakdown: breakdownData,
        isLoading: false,
        error: null,
      }));
    } catch (err: any) {
      console.error("Error loading institution attendance breakdown:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to load attendance breakdown.",
      }));
    }
  }, [institutionId, role]);

  useEffect(() => {
    if (isLoaded && isSignedIn && institutionId && state.selectedDate) {
      fetchData(state.selectedDate);
    }
  }, [isLoaded, isSignedIn, institutionId, state.selectedDate, fetchData]);

  return {
    ...state,
    setDate,
    refetch: () => fetchData(state.selectedDate),
  };
}
