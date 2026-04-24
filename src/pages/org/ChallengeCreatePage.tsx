/**
 * /org/challenges/create — RETIRED
 *
 * The canonical Challenge Creation flow is the Cogni wizard at
 * /cogni/challenges/create. This route is preserved as a permanent
 * redirect so that existing deep-links (sidebar, dashboard CTAs,
 * onboarding complete page, challenge-list empty state) keep working
 * without scattered code changes.
 */

import { Navigate } from 'react-router-dom';

export default function ChallengeCreatePage() {
  return <Navigate to="/cogni/challenges/create" replace />;
}
