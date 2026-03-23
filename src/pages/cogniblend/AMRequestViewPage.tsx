/**
 * AMRequestViewPage — Role-aware challenge view/edit page.
 * AM/RQ → SimpleIntakeForm (same layout as "New Challenge" creation).
 * CA/CR → ConversationalIntakeContent (existing behavior).
 * Defaults to read-only "view" mode with toggle to "edit".
 * Route: /cogni/my-requests/:id/view
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Eye } from 'lucide-react';
import { ConversationalIntakeContent } from '@/pages/cogniblend/ConversationalIntakePage';
import { SimpleIntakeForm } from '@/components/cogniblend/SimpleIntakeForm';
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { Button } from '@/components/ui/button';

export default function AMRequestViewPage() {
  const { id } = useParams<{ id: string }>();
  const { activeRole } = useCogniRoleContext();
  const [pageMode, setPageMode] = useState<'view' | 'edit'>('view');

  const isAmRq = activeRole === 'AM' || activeRole === 'RQ';

  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CreationContextBar />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setPageMode(pageMode === 'view' ? 'edit' : 'view')}
        >
          {pageMode === 'view' ? (
            <><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit</>
          ) : (
            <><Eye className="h-3.5 w-3.5 mr-1.5" /> Back to View</>
          )}
        </Button>
      </div>
      {isAmRq ? (
        <SimpleIntakeForm challengeId={id} mode={pageMode} />
      ) : (
        <ConversationalIntakeContent challengeId={id} mode={pageMode} hideSpecReview />
      )}
    </div>
  );
}
