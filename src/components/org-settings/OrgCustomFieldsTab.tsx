/**
 * OrgCustomFieldsTab — CRUD for org_custom_fields.
 */

import { useState } from 'react';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useOrgCustomFields, useCreateOrgCustomField, useDeleteOrgCustomField } from '@/hooks/queries/useOrgCustomFields';
import { useOrgContext } from '@/contexts/OrgContext';

interface OrgCustomFieldsTabProps { organizationId: string; }

const FIELD_TYPES = ['text', 'number', 'select', 'multi_select', 'date', 'textarea'] as const;

export function OrgCustomFieldsTab({ organizationId }: OrgCustomFieldsTabProps) {
  const { organizationId: tenantId } = useOrgContext();
  const { data: fields, isLoading } = useOrgCustomFields(organizationId);
  const createMut = useCreateOrgCustomField();
  const deleteMut = useDeleteOrgCustomField();
  const [showAdd, setShowAdd] = useState(false);

  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<string>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [appliesToMode, setAppliesToMode] = useState('ALL');

  const handleCreate = () => {
    if (!fieldName.trim() || !fieldLabel.trim()) return;
    createMut.mutate({
      organization_id: organizationId, tenant_id: tenantId,
      field_name: fieldName.trim().toLowerCase().replace(/\s+/g, '_'),
      field_label: fieldLabel.trim(), field_type: fieldType,
      is_required: isRequired, applies_to_mode: appliesToMode,
    }, { onSuccess: () => { setShowAdd(false); setFieldName(''); setFieldLabel(''); setIsRequired(false); } });
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />Custom Fields</CardTitle>
          <CardDescription>Define custom fields that appear on the challenge creation form.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Field</Button>
      </CardHeader>
      <CardContent>
        {!fields?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No custom fields defined. Add fields to extend the challenge creation form.</p>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.field_label}</TableCell>
                    <TableCell className="font-mono text-xs">{f.field_name}</TableCell>
                    <TableCell><Badge variant="outline">{f.field_type}</Badge></TableCell>
                    <TableCell>{f.is_required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>}</TableCell>
                    <TableCell><Badge variant="secondary">{f.applies_to_mode}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => deleteMut.mutate({ id: f.id, organizationId })}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Custom Field</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Field Label</Label><Input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="Display label" /></div>
            <div><Label>Field Name</Label><Input value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="unique_field_key" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={fieldType} onValueChange={setFieldType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Applies To</Label>
                <Select value={appliesToMode} onValueChange={setAppliesToMode}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ALL">All</SelectItem><SelectItem value="QUICK">QUICK</SelectItem><SelectItem value="STRUCTURED">STRUCTURED</SelectItem><SelectItem value="CONTROLLED">CONTROLLED</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <Label>Required field</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
