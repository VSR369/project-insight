/**
 * Enrollment Context
 * 
 * Provides global state for the currently active industry enrollment.
 * Used throughout the app to scope operations to a specific industry.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  
  // Track if initial selection has been done to avoid race conditions
  const [hasInitialSelection, setHasInitialSelection] = useState(false);
  
  // Track provider ID to detect user changes (login/logout/switch)
  const previousProviderId = useRef<string | null>(null);

  // Reset selection when provider ID changes (different user logged in or portal switch)
  useEffect(() => {
    const currentProviderId = provider?.id ?? null;
    const previousId = previousProviderId.current;
    
    // If provider changed (including switching between different providers)
    if (currentProviderId !== previousId) {
      // Only reset if we had a previous selection (avoid resetting on initial load)
      if (previousId !== null) {
        // Provider changed - reset all selection state
        setSelectedEnrollmentId(null);
        setHasInitialSelection(false);
        sessionStorage.removeItem('activeEnrollmentId');
      }
    }
    
    previousProviderId.current = currentProviderId;
  }, [provider?.id]);

  // Listen for storage changes from other tabs/portal switches
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'activeEnrollmentId' && event.newValue === null) {
        // Enrollment ID was cleared (portal switch or logout)
        setSelectedEnrollmentId(null);
        setHasInitialSelection(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Reset if selected enrollment no longer exists in enrollments list (user switched)
  useEffect(() => {
    if (enrollments.length > 0 && selectedEnrollmentId) {
      const stillExists = enrollments.some(e => e.id === selectedEnrollmentId);
      if (!stillExists) {
        setSelectedEnrollmentId(null);
        setHasInitialSelection(false);
        sessionStorage.removeItem('activeEnrollmentId');
      }
    }
  }, [enrollments, selectedEnrollmentId]);

  // Consolidated effect for enrollment selection with clear priority
  // This replaces two separate useEffect hooks that were racing
  useEffect(() => {
    // Wait for enrollments to load
    if (enrollments.length === 0) {
      setHasInitialSelection(false);
      return;
    }
    
    // Skip if we already have a valid selection
    if (hasInitialSelection && selectedEnrollmentId && enrollments.some(e => e.id === selectedEnrollmentId)) {
      return;
    }

    // Priority 1: Restore from sessionStorage
    const stored = sessionStorage.getItem('activeEnrollmentId');
    if (stored && enrollments.some(e => e.id === stored)) {
      setSelectedEnrollmentId(stored);
      setHasInitialSelection(true);
      return;
    }
    
    // Clear stale sessionStorage entry
    if (stored) {
      sessionStorage.removeItem('activeEnrollmentId');
    }

    // Priority 2: Use default active enrollment (primary or most recent)
    if (defaultActiveEnrollment?.id && enrollments.some(e => e.id === defaultActiveEnrollment.id)) {
      setSelectedEnrollmentId(defaultActiveEnrollment.id);
      sessionStorage.setItem('activeEnrollmentId', defaultActiveEnrollment.id);
      setHasInitialSelection(true);
      return;
    }

    // Priority 3: Use primary enrollment
    const primary = enrollments.find(e => e.is_primary);
    if (primary) {
      setSelectedEnrollmentId(primary.id);
      sessionStorage.setItem('activeEnrollmentId', primary.id);
      setHasInitialSelection(true);
      return;
    }

    // Priority 4: Fall back to first enrollment
    if (enrollments[0]?.id) {
      setSelectedEnrollmentId(enrollments[0].id);
      sessionStorage.setItem('activeEnrollmentId', enrollments[0].id);
      setHasInitialSelection(true);
    }
  }, [enrollments, defaultActiveEnrollment?.id, hasInitialSelection, selectedEnrollmentId]);

  // Derive active enrollment with defensive fallbacks
  const activeEnrollment = useMemo(() => {
    if (enrollments.length === 0) return null;

    // Try to find the selected enrollment
    if (selectedEnrollmentId) {
      const found = enrollments.find(e => e.id === selectedEnrollmentId);
      if (found) return found;
    }

    // Try to find the default active
    if (defaultActiveEnrollment?.id) {
      const found = enrollments.find(e => e.id === defaultActiveEnrollment.id);
      if (found) return found;
    }

    // Fall back to primary or first
    return enrollments.find(e => e.is_primary) || enrollments[0] || null;
  }, [selectedEnrollmentId, enrollments, defaultActiveEnrollment?.id]);

  const setActiveEnrollment = useCallback((enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    setHasInitialSelection(true);
    // Persist to sessionStorage for page refreshes
    sessionStorage.setItem('activeEnrollmentId', enrollmentId);
  }, []);

  const switchToIndustry = useCallback((industrySegmentId: string) => {
    const enrollment = enrollments.find(e => e.industry_segment_id === industrySegmentId);
    if (enrollment) {
      setActiveEnrollment(enrollment.id);
    }
  }, [enrollments, setActiveEnrollment]);

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
