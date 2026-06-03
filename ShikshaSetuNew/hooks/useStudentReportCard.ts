import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { getStudentProfileByUserId } from "@/src/repositories/studentRepository";
import { getStudentReportCard, StudentReportCardData } from "@/src/repositories/academicRepository";
import { supabase } from "@/src/lib/supabase";

export interface StudentReportCardState {
  academicYears: { id: string; label: string; is_current: boolean }[];
  selectedAcademicYearId: string | null;
  reportCard: StudentReportCardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useStudentReportCard() {
  const { userId, isSignedIn, isLoaded, role } = useAuth();
  const [state, setState] = useState<StudentReportCardState>({
    academicYears: [],
    selectedAcademicYearId: null,
    reportCard: null,
    isLoading: true,
    error: null,
  });

  // Function to change the selected academic year and load its report card
  const setSelectedAcademicYearId = (ayId: string) => {
    setState(prev => ({
      ...prev,
      selectedAcademicYearId: ayId,
    }));
  };

  const fetchData = useCallback(async (targetAyId?: string | null) => {
    if (role && role !== "student") return;
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Resolve student profile
      const studentProfile = await getStudentProfileByUserId(userId);
      if (!studentProfile) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: "Student profile not found.",
        }));
        return;
      }

      const institutionId = studentProfile.institution_id;
      const studentId = studentProfile.id;

      // 2. Fetch academic years if not loaded
      let ayList = state.academicYears;
      if (ayList.length === 0) {
        const { data, error: ayErr } = await supabase
          .from("academic_years")
          .select("id, label, is_current")
          .eq("institution_id", institutionId)
          .is("deleted_at", null)
          .order("starts_on", { ascending: false });

        if (ayErr) throw ayErr;
        ayList = data || [];
      }

      // 3. Resolve active academic year ID
      let activeAyId = targetAyId || state.selectedAcademicYearId;
      if (!activeAyId && ayList.length > 0) {
        const currentAy = ayList.find(y => y.is_current) || ayList.find(y => y.label === "2026-27") || ayList[0];
        activeAyId = currentAy.id;
      }

      if (!activeAyId) {
        setState({
          academicYears: [],
          selectedAcademicYearId: null,
          reportCard: null,
          isLoading: false,
          error: "No academic years configured for this institution.",
        });
        return;
      }

      // 4. Fetch student report card
      const reportCardData = await getStudentReportCard(studentId, activeAyId);

      setState({
        academicYears: ayList,
        selectedAcademicYearId: activeAyId,
        reportCard: reportCardData,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching report card data:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to load report card information.",
      }));
    }
  }, [userId, role, state.academicYears, state.selectedAcademicYearId]);

  // Effect to load initial data
  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchData();
    }
  }, [isLoaded, isSignedIn, userId]);

  // Effect to reload when selectedAcademicYearId changes (if triggered externally)
  useEffect(() => {
    if (isLoaded && isSignedIn && userId && state.selectedAcademicYearId) {
      // Avoid loading twice if academicYears is empty (the first effect handles that)
      if (state.academicYears.length > 0) {
        fetchData(state.selectedAcademicYearId);
      }
    }
  }, [state.selectedAcademicYearId]);

  return {
    ...state,
    setSelectedAcademicYearId,
    refetch: () => fetchData(state.selectedAcademicYearId),
  };
}
