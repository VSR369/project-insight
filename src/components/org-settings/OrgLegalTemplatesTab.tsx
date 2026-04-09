/**
 * OrgLegalTemplatesTab — Manage org-level legal document templates (AGG model).
 */

import { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useOrgLegalTemplates, useCreateOrgLegalTemplate, useUpdateOrgLegalTemplate } from '@/hooks/queries/useOrgLegalTemplates';
import { useOrgContext } from '@/contexts/OrgContext';
import { CpaTemplateSection } from './CpaTemplateSection';

interface OrgLegalTemplatesTabProps { organizationId: string; }

export function OrgLegalTemplatesTab({ organizationId }: OrgLegalTemplatesTabProps) {
  const { organizationId: tenantId } = useOrgContext();
  const { data: templates, isLoading } = useOrgLegalTemplates(organizationId);
  const createMut = useCreateOrgLegalTemplate();
  const updateMut = useUpdateOrgLegalTemplate();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [tier, setTier] = useState('TIER_1');
  const [mode, setMode] = useState('ALL');
  const [desc, setDesc] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    createMut.mutate({
      organization_id: organizationId, tenant_id: tenantId,
      document_name: name.trim(), tier, applies_to_mode: mode, description: desc.trim() || undefined,
    }, { onSuccess: () => { setShowAdd(false); setName(''); setDesc(''); } });
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <CpaTemplateSection organizationId={organizationId} tenantId={tenantId} />
      <Separator />
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Legal Templates</CardTitle>
          <CardDescription>Organization-specific legal document templates for AGG challenges.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Template</Button>
      </CardHeader>
      <CardContent>
        {!templates?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No templates configured. Add templates to auto-populate during challenge creation.</p>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.document_name}</TableCell>
                    <TableCell><Badge variant="outline">{t.tier}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{t.applies_to_mode}</Badge></TableCell>
                    <TableCell>{t.version}</TableCell>
                    <TableCell><Badge variant={t.version_status === 'ACTIVE' ? 'default' : 'secondary'}>{t.version_status}</Badge></TableCell>
                    <TableCell>
                      {t.version_status === 'ACTIVE' && (
                        <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: t.id, organization_id: organizationId, version_status: 'ARCHIVED' })}>
                          Archive
                        </Button>
                      )}
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
          <DialogHeader><DialogTitle>Add Legal Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Document Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NDA Template" /></div>
            <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tier</Label>
                <Select value={tier} onValueChange={setTier}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="TIER_1">Tier 1</SelectItem><SelectItem value="TIER_2">Tier 2</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Applies To</Label>
                <Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ALL">All Modes</SelectItem><SelectItem value="STRUCTURED">STRUCTURED</SelectItem><SelectItem value="CONTROLLED">CONTROLLED</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
