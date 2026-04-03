/**
 * LegalDocTriggerConfigPage — Manage workflow trigger rules for legal documents.
 * Route: /admin/legal-documents/triggers
 */
import * as React from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLegalDocTriggerConfig, useCreateTriggerConfig, useUpdateTriggerConfig, useDeleteTriggerConfig } from '@/hooks/admin/useLegalDocTriggerConfig';
import { LegalDocTriggerTable } from '@/components/admin/legal/LegalDocTriggerTable';
import { LegalDocTriggerForm } from '@/components/admin/legal/LegalDocTriggerForm';
import type { LegalDocTriggerConfig } from '@/types/legal.types';

export default function LegalDocTriggerConfigPage() {
  const { data: triggers = [], isLoading } = useLegalDocTriggerConfig();
  const createM = useCreateTriggerConfig();
  const updateM = useUpdateTriggerConfig();
  const deleteM = useDeleteTriggerConfig();

  const [formOpen, setFormOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<LegalDocTriggerConfig | null>(null);

  const handleSubmit = async (data: Partial<LegalDocTriggerConfig>) => {
    if (selected) {
      await updateM.mutateAsync({ id: selected.id, ...data });
    } else {
      await createM.mutateAsync(data);
    }
    setFormOpen(false);
    setSelected(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Legal Trigger Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure which documents appear at which workflow events
          </p>
        </div>
        <Button onClick={() => { setSelected(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Trigger
        </Button>
      </div>

      <LegalDocTriggerTable
        triggers={triggers}
        onEdit={(t) => { setSelected(t); setFormOpen(true); }}
        onDelete={(id) => deleteM.mutate(id)}
      />

      <LegalDocTriggerForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setSelected(null); }}
        trigger={selected}
        onSubmit={handleSubmit}
        isLoading={createM.isPending || updateM.isPending}
      />
    </div>
  );
}
