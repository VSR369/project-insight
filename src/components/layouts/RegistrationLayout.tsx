/**
 * Registration Layout
 * 
 * Wraps all registration wizard routes in a single RegistrationProvider
 * so that state persists across step navigation.
 */

import { Outlet } from 'react-router-dom';
import { RegistrationProvider } from '@/contexts/RegistrationContext';

export function RegistrationLayout() {
  return (
    <RegistrationProvider>
      <Outlet />
    </RegistrationProvider>
  );
}
