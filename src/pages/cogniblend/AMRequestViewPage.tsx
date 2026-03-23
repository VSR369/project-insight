/**
 * AMRequestViewPage — Renders the ConversationalIntakeContent form in edit mode.
 * Reuses the exact same layout as "New Challenge" creation, pre-filled with existing data.
 * Route: /cogni/my-requests/:id/view
 */

import { useParams } from 'react-router-dom';
import { ConversationalIntakeContent } from '@/pages/cogniblend/ConversationalIntakePage';
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';

export default function AMRequestViewPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      <CreationContextBar />
      <ConversationalIntakeContent challengeId={id} mode="edit" />
    </div>
  );
}
