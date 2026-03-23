/**
 * AMRequestViewPage — Renders the intake form in edit mode for existing challenges.
 * Reuses the same SimpleIntakeForm used during creation, pre-filled with existing data.
 * Route: /cogni/my-requests/:id/view
 */

import { useParams } from 'react-router-dom';
import { SimpleIntakeForm } from '@/components/cogniblend/SimpleIntakeForm';
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';

export default function AMRequestViewPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      <CreationContextBar />
      <SimpleIntakeForm challengeId={id} mode="edit" />
    </div>
  );
}
