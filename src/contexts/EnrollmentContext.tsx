/**
 * Enrollment Context
 * 
 * Provides global state for the currently active industry enrollment.
 * Used throughout the app to scope operations to a specific industry.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProviderEnrollments, useActiveEnrollment, type EnrollmentWithDetails } from '@/hooks/queries/useProviderEnrollments';

interface EnrollmentContextType {
  /** All enrollments for the current provider */
  enrollments: EnrollmentWithDetails[];
  
  /** The currently active/selected enrollment */
  activeEnrollment: EnrollmentWithDetails | null;
  
  /** ID of the active enrollment */
  activeEnrollmentId: string | null;
  
  /** Industry segment ID of the active enrollment */
  activeIndustryId: string | null;
  
  /** Set the active enrollment by ID */
  setActiveEnrollment: (enrollmentId: string) => void;
  
  /** Switch to a specific industry (finds enrollment by industry ID) */
  switchToIndustry: (industrySegmentId: string) => void;
  
  /** Whether enrollment data is loading */
  isLoading: boolean;
  
  /** Whether the provider has multiple industries */
  hasMultipleIndustries: boolean;
  
  /** Get lifecycle rank for the active enrollment (fallback to provider if no enrollment) */
  activeLifecycleRank: number;
  
  /** Get lifecycle status for the active enrollment */
  activeLifecycleStatus: string | null;
  
  /** Refresh enrollments data */
  refreshEnrollments: () => void;
}

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(undefined);

interface EnrollmentProviderProps {
  children: React.ReactNode;
}

export function EnrollmentProvider({ children }: EnrollmentProviderProps) {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { 
    data: enrollments = [], 
    isLoading: enrollmentsLoading,
    refetch: refetchEnrollments,
  } = useProviderEnrollments(provider?.id);
  
  const { 
    data: defaultActiveEnrollment,
    isLoading: activeLoading,
  } = useActiveEnrollment(provider?.id);

  // Track the currently selected enrollment ID
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);

  // Determine the active enrollment
  const activeEnrollment = useMemo(() => {
    if (selectedEnrollmentId) {
      return enrollments.find(e => e.id === selectedEnrollmentId) || null;
    }
    return defaultActiveEnrollment || null;
  }, [selectedEnrollmentId, enrollments, defaultActiveEnrollment]);

  // Auto-select when default becomes available
  useEffect(() => {
    if (!selectedEnrollmentId && defaultActiveEnrollment?.id) {
      setSelectedEnrollmentId(defaultActiveEnrollment.id);
    }
  }, [defaultActiveEnrollment?.id, selectedEnrollmentId]);

  const setActiveEnrollment = useCallback((enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    // Persist to sessionStorage for page refreshes
    sessionStorage.setItem('activeEnrollmentId', enrollmentId);
  }, []);

  const switchToIndustry = useCallback((industrySegmentId: string) => {
    const enrollment = enrollments.find(e => e.industry_segment_id === industrySegmentId);
    if (enrollment) {
      setActiveEnrollment(enrollment.id);
    }
  }, [enrollments, setActiveEnrollment]);

  // Restore from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('activeEnrollmentId');
    if (stored && enrollments.some(e => e.id === stored)) {
      setSelectedEnrollmentId(stored);
    }
  }, [enrollments]);

  const refreshEnrollments = useCallback(() => {
    refetchEnrollments();
  }, [refetchEnrollments]);

  const isLoading = providerLoading || enrollmentsLoading || activeLoading;
  const hasMultipleIndustries = enrollments.length > 1;
  
  // Get lifecycle info from active enrollment, fallback to provider
  const activeLifecycleRank = activeEnrollment?.lifecycle_rank ?? provider?.lifecycle_rank ?? 0;
  const activeLifecycleStatus = activeEnrollment?.lifecycle_status ?? provider?.lifecycle_status ?? null;

  const value: EnrollmentContextType = {
    enrollments,
    activeEnrollment,
    activeEnrollmentId: activeEnrollment?.id ?? null,
    activeIndustryId: activeEnrollment?.industry_segment_id ?? null,
    setActiveEnrollment,
    switchToIndustry,
    isLoading,
    hasMultipleIndustries,
    activeLifecycleRank,
    activeLifecycleStatus,
    refreshEnrollments,
  };

  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  );
}

/**
 * Hook to access the enrollment context
 * Must be used within EnrollmentProvider
 */
export function useEnrollmentContext() {
  const context = useContext(EnrollmentContext);
  if (context === undefined) {
    throw new Error('useEnrollmentContext must be used within an EnrollmentProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if outside provider (useful for shared components)
 */
export function useOptionalEnrollmentContext() {
  return useContext(EnrollmentContext);
}
