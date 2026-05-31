import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import {
  getStudentProfileByUserId,
  getStudentPendingFees,
  getStudentHomeworkStats,
  getStudentExamStats,
  getStudentUpcomingExam,
  getLatestCirculars,
} from "@/src/repositories/studentRepository";
import { StudentProfile } from "@/src/types/student";

export interface StudentDashboardData {
  student: StudentProfile | null;
  upcomingExam: {
    id: string;
    exam_name: string;
    exam_date: string;
    subject_name: string;
  } | null;
  pendingFee: {
    id: string;
    fee_name: string;
    amount: number;
    amount_paid: number;
    pending_amount: number;
    due_date: string | null;
  } | null;
  stats: {
    homeworkAvg: number;
    homeworkLabel: string;
    examAvg: number;
  };
  circulars: any[];
  isLoading: boolean;
  error: string | null;
}

export function useStudentDashboard() {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const [data, setData] = useState<StudentDashboardData>({
    student: null,
    upcomingExam: null,
    pendingFee: null,
    stats: {
      homeworkAvg: 0,
      homeworkLabel: "Homework Avg",
      examAvg: 0,
    },
    circulars: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Fetch Profile
      const studentProfile = await getStudentProfileByUserId(userId);
      if (!studentProfile) {
        console.warn("Student profile not found for user:", userId);
        setData({
          student: null,
          upcomingExam: null,
          pendingFee: null,
          stats: {
            homeworkAvg: 0,
            homeworkLabel: "No submissions yet",
            examAvg: 0,
          },
          circulars: [],
          isLoading: false,
          error: null,
        });
        return;
      }

      const studentId = studentProfile.id;
      const classId = studentProfile.class_id || "";
      const institutionId = studentProfile.institution_id || "";

      // 2. Fetch everything in parallel
      const [
        fees,
        homeworkStats,
        examStats,
        upcomingExam,
        circularsList,
      ] = await Promise.all([
        getStudentPendingFees(studentId, classId),
        getStudentHomeworkStats(studentId),
        getStudentExamStats(studentId),
        getStudentUpcomingExam(classId),
        getLatestCirculars(institutionId),
      ]);

      // 3. Format Pending Fee (Get the first/most urgent pending fee)
      const primaryPendingFee = fees.length > 0 ? fees[0] : null;

      // 4. Homework Label Logic
      // For empty homework submissions, show the ring at 0% with label "No submissions yet"
      const homeworkLabel = homeworkStats.count === 0 ? "No submissions yet" : "Homework Avg";
      const homeworkAvg = homeworkStats.count === 0 ? 0 : homeworkStats.avg;

      setData({
        student: studentProfile,
        upcomingExam,
        pendingFee: primaryPendingFee,
        stats: {
          homeworkAvg,
          homeworkLabel,
          examAvg: examStats.avg,
        },
        circulars: circularsList,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching student dashboard data:", err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to load dashboard data.",
      }));
    }
  }, [userId]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchData();
    }
  }, [isLoaded, isSignedIn, userId, fetchData]);

  return {
    ...data,
    refetch: fetchData,
  };
}
