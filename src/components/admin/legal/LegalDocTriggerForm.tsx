/**
 * LegalDocTriggerForm — Add/edit trigger config in a sheet.
 */
import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { TRIGGER_EVENT_LABELS } from '@/types/legal.types';
import type { LegalDocTriggerConfig, DocumentCode, TriggerEvent, AppliesMode } from '@/types/legal.types';

const schema = z.object({
  document_code: z.string().min(1),
  document_section: z.string().nullable().optional(),
  trigger_event: z.string().min(1),
  applies_to_mode: z.string().min(1),
  is_mandatory: z.boolean(),
  display_order: z.number().int().min(0),
});
type FormValues = z.infer<typeof schema>;

interface LegalDocTriggerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: LegalDocTriggerConfig | null;
  onSubmit: (data: Partial<LegalDocTriggerConfig>) => Promise<void>;
  isLoading: boolean;
}

const DOC_CODES: DocumentCode[] = ['PMA', 'CA', 'PSA', 'IPAA', 'EPIA'];
const MODES: AppliesMode[] = ['QUICK', 'STRUCTURED', 'CONTROLLED', 'ALL'];
const EVENTS = Object.keys(TRIGGER_EVENT_LABELS) as TriggerEvent[];

export function LegalDocTriggerForm({ open, onOpenChange, trigger, onSubmit, isLoading }: LegalDocTriggerFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      document_code: trigger?.document_code ?? 'PMA',
      document_section: trigger?.document_section ?? null,
      trigger_event: trigger?.trigger_event ?? 'USER_REGISTRATION',
      applies_to_mode: trigger?.applies_to_mode ?? 'ALL',
      is_mandatory: trigger?.is_mandatory ?? true,
      display_order: trigger?.display_order ?? 0,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        document_code: trigger?.document_code ?? 'PMA',
        document_section: trigger?.document_section ?? null,
        trigger_event: trigger?.trigger_event ?? 'USER_REGISTRATION',
        applies_to_mode: trigger?.applies_to_mode ?? 'ALL',
        is_mandatory: trigger?.is_mandatory ?? true,
        display_order: trigger?.display_order ?? 0,
      });
    }
  }, [open, trigger, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      document_section: data.document_section || null,
      required_roles: ['{ALL}'] as unknown as string[],
    } as Partial<LegalDocTriggerConfig>);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{trigger ? 'Edit' : 'Add'} Trigger Rule</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Document Code</Label>
            <Select value={form.watch('document_code')} onValueChange={(v) => form.setValue('document_code', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Section (optional, for IPAA)</Label>
            <Input {...form.register('document_section')} placeholder="e.g., abstract, milestone" />
          </div>
          <div className="space-y-2">
            <Label>Trigger Event</Label>
            <Select value={form.watch('trigger_event')} onValueChange={(v) => form.setValue('trigger_event', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENTS.map((e) => <SelectItem key={e} value={e}>{TRIGGER_EVENT_LABELS[e]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Governance Mode</Label>
            <Select value={form.watch('applies_to_mode')} onValueChange={(v) => form.setValue('applies_to_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Display Order</Label>
            <Input type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Mandatory</Label>
            <Switch checked={form.watch('is_mandatory')} onCheckedChange={(v) => form.setValue('is_mandatory', v)} />
          </div>
          <SheetFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {trigger ? 'Update' : 'Create'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
