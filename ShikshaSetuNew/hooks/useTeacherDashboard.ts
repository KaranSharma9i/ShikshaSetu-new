import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { getTeacherDashboardStats, TeacherDashboardStats } from "@/src/repositories/teacherRepository";
import { supabase } from "@/src/lib/supabase";

export interface ClassTeacherInfo {
  class_name: string;
  section_name: string;
}

export interface TeacherDashboardState {
  stats: TeacherDashboardStats | null;
  classTeacherInfo: ClassTeacherInfo | null;
  isLoading: boolean;
  error: string | null;
}

export function useTeacherDashboard() {
  const { userId, isSignedIn, isLoaded, role } = useAuth();
  const [state, setState] = useState<TeacherDashboardState>({
    stats: null,
    classTeacherInfo: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (role && role !== "teacher") return;
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Fetch main dashboard stats and class teacher status in parallel
      const [statsData, classTeacherRes] = await Promise.all([
        getTeacherDashboardStats(userId),
        supabase
          .from("sections")
          .select(`
            name,
            class:classes (
              name
            )
          `)
          .eq("class_teacher_id", userId)
          .is("deleted_at", null)
          .limit(1)
      ]);

      if (!statsData) {
        setState({
          stats: null,
          classTeacherInfo: null,
          isLoading: false,
          error: "Teacher profile or data not found.",
        });
        return;
      }

      // 2. Parse class teacher info
      let classTeacherInfo: ClassTeacherInfo | null = null;
      if (classTeacherRes.data && classTeacherRes.data.length > 0) {
        const sec = classTeacherRes.data[0] as any;
        const className = Array.isArray(sec.class) ? sec.class[0]?.name : sec.class?.name;
        if (className && sec.name) {
          classTeacherInfo = {
            class_name: className,
            section_name: sec.name,
          };
        }
      }

      setState({
        stats: statsData,
        classTeacherInfo,
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
