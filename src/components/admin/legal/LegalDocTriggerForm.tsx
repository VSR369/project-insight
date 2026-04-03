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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { TRIGGER_EVENT_LABELS, TRIGGER_EVENT_DESCRIPTIONS } from '@/types/legal.types';
import type { LegalDocTriggerConfig, DocumentCode, TriggerEvent, AppliesMode } from '@/types/legal.types';

const schema = z.object({
  document_code: z.string().min(1),
  document_section: z.string().nullable().optional(),
  trigger_event: z.string().min(1),
  applies_to_mode: z.string().min(1),
  is_mandatory: z.boolean(),
  is_active: z.boolean(),
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

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'CR', label: 'Challenge Requester' },
  { value: 'CU', label: 'Curator' },
  { value: 'ER', label: 'Evaluator/Reviewer' },
  { value: 'LC', label: 'Legal Coordinator' },
  { value: 'FC', label: 'Finance Coordinator' },
  { value: 'SOLVER', label: 'Solver' },
] as const;

export function LegalDocTriggerForm({ open, onOpenChange, trigger, onSubmit, isLoading }: LegalDocTriggerFormProps) {
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>(['ALL']);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      document_code: trigger?.document_code ?? 'PMA',
      document_section: trigger?.document_section ?? null,
      trigger_event: trigger?.trigger_event ?? 'USER_REGISTRATION',
      applies_to_mode: trigger?.applies_to_mode ?? 'ALL',
      is_mandatory: trigger?.is_mandatory ?? true,
      is_active: trigger?.is_active ?? true,
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
        is_active: trigger?.is_active ?? true,
        display_order: trigger?.display_order ?? 0,
      });
      setSelectedRoles(trigger?.required_roles ?? ['ALL']);
    }
  }, [open, trigger, form]);

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (role === 'ALL') {
      setSelectedRoles(checked ? ['ALL'] : []);
      return;
    }
    const current = selectedRoles.filter((r) => r !== 'ALL');
    const updated = checked ? [...current, role] : current.filter((r) => r !== role);
    setSelectedRoles(updated.length === 0 ? ['ALL'] : updated);
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      document_section: data.document_section || null,
      required_roles: selectedRoles,
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
                {EVENTS.map((e) => (
                  <SelectItem key={e} value={e}>
                    <div className="flex flex-col">
                      <span>{TRIGGER_EVENT_LABELS[e]}</span>
                      <span className="text-xs text-muted-foreground">
                        {TRIGGER_EVENT_DESCRIPTIONS[e]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
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
            <Label>Required Roles</Label>
            <div className="space-y-2 rounded-md border p-3">
              {ROLE_OPTIONS.map((role) => (
                <div key={role.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`trigger-role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={(checked) => handleRoleToggle(role.value, checked === true)}
                  />
                  <label htmlFor={`trigger-role-${role.value}`} className="text-sm cursor-pointer">
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display Order</Label>
            <Input type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mandatory</Label>
            <Switch checked={form.watch('is_mandatory')} onCheckedChange={(v) => form.setValue('is_mandatory', v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.watch('is_active')} onCheckedChange={(v) => form.setValue('is_active', v)} />
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
