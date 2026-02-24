/**
 * Registration Layout
 * 
 * Wraps all registration wizard routes in a single RegistrationProvider
 * so that state persists across step navigation.
 * 
 * Detects ?new=1 query param to reset state for fresh registrations.
 */

import { Outlet, useSearchParams } from 'react-router-dom';
import { RegistrationProvider, useRegistrationContext } from '@/contexts/RegistrationContext';
import { useEffect, useRef } from 'react';

/**
 * Inner component that has access to RegistrationContext.
 * Checks for ?new=1 param and resets state if present.
 */
function RegistrationResetGuard({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { reset } = useRegistrationContext();
  const hasReset = useRef(false);

  useEffect(() => {
    if (searchParams.get('new') === '1' && !hasReset.current) {
      hasReset.current = true;
      reset();
      // Remove ?new=1 from URL to prevent re-clearing on refresh
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, reset]);

  return <>{children}</>;
}

export function RegistrationLayout() {
  return (
    <RegistrationProvider>
      <RegistrationResetGuard>
        <Outlet />
      </RegistrationResetGuard>
    </RegistrationProvider>
  );
}
