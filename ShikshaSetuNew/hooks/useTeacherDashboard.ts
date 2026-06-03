import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { getTeacherDashboardStats, TeacherDashboardStats } from "@/src/repositories/teacherRepository";

export interface TeacherDashboardState {
  stats: TeacherDashboardStats | null;
  isLoading: boolean;
  error: string | null;
}

export function useTeacherDashboard() {
  const { userId, isSignedIn, isLoaded, role } = useAuth();
  const [state, setState] = useState<TeacherDashboardState>({
    stats: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (role && role !== "teacher") return;
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await getTeacherDashboardStats(userId);
      if (!data) {
        setState({
          stats: null,
          isLoading: false,
          error: "Teacher profile or data not found.",
        });
        return;
      }

      setState({
        stats: data,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error loading teacher dashboard:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to load dashboard data.",
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
