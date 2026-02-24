/**
 * Registration Context
 * 
 * Shared wizard state across all 5 registration steps.
 * Per Project Knowledge: minimize context usage, justify each use.
 * This is justified because registration data must persist across 5 route-level pages.
 * 
 * Persistence: state is synced to sessionStorage so it survives page refreshes
 * and direct URL navigation. File objects are stripped before serialization.
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  RegistrationState,
  OrganizationIdentityData,
  PrimaryContactData,
  ComplianceData,
  PlanSelectionData,
  BillingData,
  LocaleInfo,
  OrgTypeFlags,
} from '@/types/registration';

// ============================================================
// SessionStorage Persistence
// ============================================================
const STORAGE_KEY = 'registration_wizard_state';

function loadPersistedState(): RegistrationState {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && typeof parsed.currentStep === 'number') {
        return parsed as RegistrationState;
      }
    }
  } catch {
    /* ignore parse errors or unavailable storage */
  }
  return initialState;
}

function persistState(state: RegistrationState) {
  try {
    // Strip File objects (not JSON-serializable)
    const serializable = {
      ...state,
      step1: state.step1 ? {
        ...state.step1,
        logo_file: undefined,
        profile_document: undefined,
        verification_documents: undefined,
      } : undefined,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    /* storage full or unavailable — silently degrade */
  }
}

function clearPersistedState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ============================================================
// Actions
// ============================================================
type RegistrationAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ORG_ID'; organizationId: string; tenantId: string }
  | { type: 'SET_STEP1'; data: OrganizationIdentityData }
  | { type: 'SET_STEP2'; data: PrimaryContactData }
  | { type: 'SET_STEP3'; data: ComplianceData }
  | { type: 'SET_STEP4'; data: PlanSelectionData }
  | { type: 'SET_STEP5'; data: BillingData }
  | { type: 'SET_LOCALE'; locale: LocaleInfo }
  | { type: 'SET_ORG_TYPE_FLAGS'; flags: OrgTypeFlags }
  | { type: 'RESET' };

// ============================================================
// Initial State
// ============================================================
const initialState: RegistrationState = {
  currentStep: 1,
};

// ============================================================
// Reducer
// ============================================================
function registrationReducer(state: RegistrationState, action: RegistrationAction): RegistrationState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SET_ORG_ID':
      return { ...state, organizationId: action.organizationId, tenantId: action.tenantId };
    case 'SET_STEP1':
      return { ...state, step1: action.data };
    case 'SET_STEP2':
      return { ...state, step2: action.data };
    case 'SET_STEP3':
      return { ...state, step3: action.data };
    case 'SET_STEP4':
      return { ...state, step4: action.data };
    case 'SET_STEP5':
      return { ...state, step5: action.data };
    case 'SET_LOCALE':
      return { ...state, localeInfo: action.locale };
    case 'SET_ORG_TYPE_FLAGS':
      return { ...state, orgTypeFlags: action.flags };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

/**
 * Wraps the reducer to persist state after every action.
 * On RESET, clears sessionStorage.
 */
function persistedReducer(state: RegistrationState, action: RegistrationAction): RegistrationState {
  const nextState = registrationReducer(state, action);
  if (action.type === 'RESET') {
    clearPersistedState();
  } else {
    persistState(nextState);
  }
  return nextState;
}

// ============================================================
// Context
// ============================================================
interface RegistrationContextValue {
  state: RegistrationState;
  setStep: (step: number) => void;
  setOrgId: (organizationId: string, tenantId: string) => void;
  setStep1Data: (data: OrganizationIdentityData) => void;
  setStep2Data: (data: PrimaryContactData) => void;
  setStep3Data: (data: ComplianceData) => void;
  setStep4Data: (data: PlanSelectionData) => void;
  setStep5Data: (data: BillingData) => void;
  setLocale: (locale: LocaleInfo) => void;
  setOrgTypeFlags: (flags: OrgTypeFlags) => void;
  reset: () => void;
}

const RegistrationContext = createContext<RegistrationContextValue | undefined>(undefined);

// ============================================================
// Provider
// ============================================================
export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(persistedReducer, undefined, loadPersistedState);

  const setStep = useCallback((step: number) => dispatch({ type: 'SET_STEP', step }), []);
  const setOrgId = useCallback((organizationId: string, tenantId: string) => dispatch({ type: 'SET_ORG_ID', organizationId, tenantId }), []);
  const setStep1Data = useCallback((data: OrganizationIdentityData) => dispatch({ type: 'SET_STEP1', data }), []);
  const setStep2Data = useCallback((data: PrimaryContactData) => dispatch({ type: 'SET_STEP2', data }), []);
  const setStep3Data = useCallback((data: ComplianceData) => dispatch({ type: 'SET_STEP3', data }), []);
  const setStep4Data = useCallback((data: PlanSelectionData) => dispatch({ type: 'SET_STEP4', data }), []);
  const setStep5Data = useCallback((data: BillingData) => dispatch({ type: 'SET_STEP5', data }), []);
  const setLocale = useCallback((locale: LocaleInfo) => dispatch({ type: 'SET_LOCALE', locale }), []);
  const setOrgTypeFlags = useCallback((flags: OrgTypeFlags) => dispatch({ type: 'SET_ORG_TYPE_FLAGS', flags }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <RegistrationContext.Provider value={{
      state, setStep, setOrgId, setStep1Data, setStep2Data, setStep3Data,
      setStep4Data, setStep5Data, setLocale, setOrgTypeFlags, reset,
    }}>
      {children}
    </RegistrationContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================
export function useRegistrationContext() {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationContext must be used within RegistrationProvider');
  }
  return context;
}
