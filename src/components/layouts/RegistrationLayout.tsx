/**
 * Registration Layout
 * 
 * Wraps all registration wizard routes in a single RegistrationProvider
 * so that state persists across step navigation.
 * 
 * Synchronously clears sessionStorage when ?new=1 is detected,
 * BEFORE RegistrationProvider mounts — preventing stale data from
 * being loaded into the wizard forms.
 */

import { Outlet } from 'react-router-dom';
import { RegistrationProvider } from '@/contexts/RegistrationContext';

const STORAGE_KEY = 'registration_wizard_state';

export function RegistrationLayout() {
  // Synchronous check BEFORE RegistrationProvider mounts.
  // If ?new=1 is present, clear sessionStorage so loadPersistedState()
  // returns initialState (blank form). Then strip the param from URL.
  const params = new URLSearchParams(window.location.search);
  if (params.get('new') === '1') {
    sessionStorage.removeItem(STORAGE_KEY);
    params.delete('new');
    const search = params.toString();
    const newUrl = window.location.pathname + (search ? '?' + search : '');
    window.history.replaceState({}, '', newUrl);
  }

  return (
    <RegistrationProvider>
      <Outlet />
    </RegistrationProvider>
  );
}
