/**
 * LegalDocTriggerTable — Displays trigger config rows with status, labels, and delete confirmation.
 */
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2 } from 'lucide-react';
import { DOCUMENT_CODE_LABELS, TRIGGER_EVENT_LABELS } from '@/types/legal.types';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import type { LegalDocTriggerConfig, DocumentCode } from '@/types/legal.types';

interface LegalDocTriggerTableProps {
  triggers: LegalDocTriggerConfig[];
  onEdit: (trigger: LegalDocTriggerConfig) => void;
  onDelete: (id: string) => void;
}

export function LegalDocTriggerTable({ triggers, onEdit, onDelete }: LegalDocTriggerTableProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<LegalDocTriggerConfig | null>(null);

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
    }
  };

  if (triggers.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No trigger rules configured.</p>;
  }

  return (
    <>
      <div className="relative w-full overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Document</th>
              <th className="text-left p-3 font-medium">Section</th>
              <th className="text-left p-3 font-medium">Trigger Event</th>
              <th className="text-left p-3 font-medium">Roles</th>
              <th className="text-left p-3 font-medium">Mode</th>
              <th className="text-center p-3 font-medium">Mandatory</th>
              <th className="text-center p-3 font-medium">Order</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map((t) => (
              <tr key={t.id} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-xs">
                      {DOCUMENT_CODE_LABELS[t.document_code as DocumentCode] ?? t.document_code}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs w-fit">{t.document_code}</Badge>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{t.document_section ?? 'Whole doc'}</td>
                <td className="p-3">{TRIGGER_EVENT_LABELS[t.trigger_event] ?? t.trigger_event}</td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {t.required_roles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3"><Badge variant="outline">{t.applies_to_mode}</Badge></td>
                <td className="p-3 text-center">
                  <Switch checked={t.is_mandatory} disabled className="pointer-events-none" />
                </td>
                <td className="p-3 text-center">{t.display_order}</td>
                <td className="p-3 text-center">
                  <StatusBadge isActive={t.is_active} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Trigger Rule"
        itemName={deleteTarget ? `${DOCUMENT_CODE_LABELS[deleteTarget.document_code as DocumentCode] ?? deleteTarget.document_code} — ${TRIGGER_EVENT_LABELS[deleteTarget.trigger_event] ?? deleteTarget.trigger_event}` : undefined}
        onConfirm={handleConfirmDelete}
        isSoftDelete={false}
      />
    </>
  );
}
