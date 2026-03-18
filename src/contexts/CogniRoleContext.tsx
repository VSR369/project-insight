/**
 * CogniRoleContext — Provides workspace-mode role context for CogniBlend.
 * Manages activeRole state with localStorage persistence and cross-tab sync.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useCogniUserRoles } from '@/hooks/cogniblend/useCogniUserRoles';
import {
  ROLE_PRIORITY,
  getPrimaryRole,
  type CogniRoleContextType,
} from '@/types/cogniRoles';

const STORAGE_KEY = 'cogni_active_role';

const CogniRoleContext = createContext<CogniRoleContextType | null>(null);

export function CogniRoleProvider({ children }: { children: ReactNode }) {
  // ══════════════════════════════════════
  // SECTION 1: useState
  // ══════════════════════════════════════
  const [activeRole, setActiveRoleState] = useState<string>('');

  // ══════════════════════════════════════
  // SECTION 2: Custom hooks
  // ══════════════════════════════════════
  const { allRoleCodes, data: roleData, isLoading } = useCogniUserRoles();

  // ══════════════════════════════════════
  // SECTION 3: Derived data (useMemo)
  // ══════════════════════════════════════
  const availableRoles = useMemo(() => {
    return ROLE_PRIORITY.filter((code) => allRoleCodes.has(code));
  }, [allRoleCodes]);

  const isSoloMode = availableRoles.length >= 6;

  const challengeRoleMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (roleData) {
      for (const row of roleData) {
        map.set(row.challenge_id, row.role_codes ?? []);
      }
    }
    return map;
  }, [roleData]);

  const roleChallengeCount = useMemo(() => {
    const counts: Record<string, number> = {};
    if (roleData) {
      for (const row of roleData) {
        for (const code of row.role_codes ?? []) {
          counts[code] = (counts[code] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [roleData]);

  // ══════════════════════════════════════
  // SECTION 5: useEffect
  // ══════════════════════════════════════

  // Initialize activeRole from localStorage or primary role
  useEffect(() => {
    if (availableRoles.length === 0) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && availableRoles.includes(stored)) {
      setActiveRoleState(stored);
    } else {
      const primary = getPrimaryRole(new Set(availableRoles));
      setActiveRoleState(primary);
      localStorage.setItem(STORAGE_KEY, primary);
    }
  }, [availableRoles]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && availableRoles.includes(e.newValue)) {
        setActiveRoleState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [availableRoles]);

  // ══════════════════════════════════════
  // SECTION 7: Handlers
  // ══════════════════════════════════════
  const setActiveRole = useCallback(
    (code: string) => {
      if (!availableRoles.includes(code)) return; // validation
      setActiveRoleState(code);
      localStorage.setItem(STORAGE_KEY, code);
    },
    [availableRoles],
  );

  const getRolesForChallenge = useCallback(
    (challengeId: string): string[] => {
      return challengeRoleMap.get(challengeId) ?? [];
    },
    [challengeRoleMap],
  );

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  const value = useMemo<CogniRoleContextType>(
    () => ({
      activeRole,
      availableRoles,
      isSoloMode,
      challengeRoleMap,
      setActiveRole,
      getRolesForChallenge,
      isRolesLoading: isLoading,
      roleChallengeCount,
    }),
    [
      activeRole,
      availableRoles,
      isSoloMode,
      challengeRoleMap,
      setActiveRole,
      getRolesForChallenge,
      isLoading,
      roleChallengeCount,
    ],
  );

  return (
    <CogniRoleContext.Provider value={value}>
      {children}
    </CogniRoleContext.Provider>
  );
}

export function useCogniRoleContext(): CogniRoleContextType {
  const ctx = useContext(CogniRoleContext);
  if (!ctx) {
    throw new Error('useCogniRoleContext must be used within CogniRoleProvider');
  }
  return ctx;
}
