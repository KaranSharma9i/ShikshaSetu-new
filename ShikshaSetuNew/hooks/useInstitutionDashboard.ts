import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { getInstitutionDashboardMetrics, InstitutionDashboardMetrics } from "@/src/repositories/metricRepository";
import { getCirculars } from "@/src/repositories/circularRepository";
import { Circular } from "@/constants/schoolData";

export interface InstitutionDashboardState {
  metrics: InstitutionDashboardMetrics | null;
  circulars: Circular[];
  isLoading: boolean;
  error: string | null;
}

export function useInstitutionDashboard() {
  const { institutionId, isSignedIn, isLoaded, role } = useAuth();
  const [state, setState] = useState<InstitutionDashboardState>({
    metrics: null,
    circulars: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (role && role !== "institution_admin") return;
    if (!institutionId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [metricsData, circularsList] = await Promise.all([
        getInstitutionDashboardMetrics(institutionId),
        getCirculars(institutionId),
      ]);

      setState({
        metrics: metricsData,
        circulars: circularsList,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error loading institution dashboard data:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to load institution dashboard data.",
      }));
    }
  }, [institutionId, role]);

  useEffect(() => {
    if (isLoaded && isSignedIn && institutionId) {
      fetchData();
    }
  }, [isLoaded, isSignedIn, institutionId, fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}
