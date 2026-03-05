import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logWarning } from '@/lib/errorHandler';
import { queryClient } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track whether the initial session has been resolved to prevent race conditions
  const initialSessionResolved = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Only process auth state changes after initial session is resolved
        // This prevents the race condition where onAuthStateChange fires with null
        // before getSession() completes, causing intermittent redirects
        if (!initialSessionResolved.current) {
          // During initial load, only update state if we get a valid session
          // (this handles cases where onAuthStateChange fires before getSession)
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
          }
          return;
        }

        // After initial resolution, process all auth state changes normally
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // CRITICAL: Clear all cached data when auth state changes
        // This ensures fresh data fetch for new user (login) or clean state (logout)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          queryClient.clear();
          // Clear enrollment session storage on BOTH login and logout
          // This prevents stale enrollment IDs from previous user sessions
          sessionStorage.removeItem('activeEnrollmentId');
          // Only clear portal preference on sign out (preserve it on sign in)
          if (event === 'SIGNED_OUT') {
            sessionStorage.removeItem('activePortal');
            sessionStorage.removeItem('proofPoint.lastCategory');
          }
        }
      }
    );

    // THEN check for existing session - this is the authoritative initial state
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      // Mark initial session as resolved BEFORE setting loading to false
      // This ensures onAuthStateChange won't cause race conditions
      initialSessionResolved.current = true;
      setLoading(false);
    }).catch((err) => {
      // Handle network failures during initial session check gracefully
      // instead of crashing the AuthProvider and losing context for children
      logWarning('Initial session check failed, continuing without session', { operation: 'auth_init', additionalData: { error: err?.message } });
      initialSessionResolved.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (err) {
      // If fetchWithRetry exhausted all retries, provide a clear message
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        return {
          error: new Error('Network connection failed after multiple retries. Please refresh your browser and try again.'),
        };
      }
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear React Query cache before signing out
    queryClient.clear();
    // Clear all portal-related session storage
    sessionStorage.removeItem('activeEnrollmentId');
    sessionStorage.removeItem('activePortal');
    sessionStorage.removeItem('proofPoint.lastCategory');
    // Sign out from Supabase
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Optional variant of useAuth that returns null instead of throwing
 * when used outside AuthProvider context. Use this in components that
 * may render during ErrorBoundary recovery or other edge cases.
 */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) ?? null;
}
