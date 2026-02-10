/**
 * SaasAgreementPage — Admin: Create/manage SaaS agreements between parent & child orgs
 * Phase 6: SAS-001
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, FileText, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useSaasAgreements, useCreateSaasAgreement, useUpdateSaasAgreement } from '@/hooks/queries/useSaasData';

const DEMO_PARENT_ORG_ID = 'demo-parent-org';
const DEMO_TENANT_ID = 'demo-tenant';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  active: 'default',
  expired: 'secondary',
  cancelled: 'destructive',
  suspended: 'outline',
};

export default function SaasAgreementPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    child_organization_id: '',
    agreement_type: 'saas_fee',
    fee_amount: '',
    fee_currency: 'USD',
    fee_frequency: 'monthly',
    shadow_charge_rate: '',
    notes: '',
  });

  const { data: agreements, isLoading } = useSaasAgreements(DEMO_PARENT_ORG_ID);
  const createAgreement = useCreateSaasAgreement();
  const updateAgreement = useUpdateSaasAgreement();

  const handleCreate = () => {
    createAgreement.mutate({
      tenant_id: DEMO_TENANT_ID,
      parent_organization_id: DEMO_PARENT_ORG_ID,
      child_organization_id: formData.child_organization_id,
      agreement_type: formData.agreement_type,
      fee_amount: Number(formData.fee_amount) || 0,
      fee_currency: formData.fee_currency,
      fee_frequency: formData.fee_frequency,
      shadow_charge_rate: Number(formData.shadow_charge_rate) || 0,
      notes: formData.notes || undefined,
    });
    setCreateDialogOpen(false);
    setFormData({
      child_organization_id: '',
      agreement_type: 'saas_fee',
      fee_amount: '',
      fee_currency: 'USD',
      fee_frequency: 'monthly',
      shadow_charge_rate: '',
      notes: '',
    });
  };

  const handleSuspend = (agreementId: string) => {
    updateAgreement.mutate({
      agreementId,
      parentOrgId: DEMO_PARENT_ORG_ID,
      updates: { lifecycle_status: 'suspended' },
    });
  };

  const handleActivate = (agreementId: string) => {
    updateAgreement.mutate({
      agreementId,
      parentOrgId: DEMO_PARENT_ORG_ID,
      updates: { lifecycle_status: 'active' },
    });
  };

  return (
    <AdminLayout
      title="SaaS Agreements"
      description="Manage SaaS fee agreements between parent and child organizations"
      breadcrumbs={[{ label: 'SaaS Agreements' }]}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Agreement
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Active Agreements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : agreements && agreements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((agreement) => {
                    const childOrg = agreement.seeker_organizations as { organization_name: string } | null;
                    return (
                      <TableRow key={agreement.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {childOrg?.organization_name ?? agreement.child_organization_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {agreement.agreement_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agreement.fee_currency} {Number(agreement.fee_amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">{agreement.fee_frequency}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[agreement.lifecycle_status] ?? 'secondary'} className="text-xs">
                            {agreement.lifecycle_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(agreement.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {agreement.lifecycle_status === 'active' && (
                            <Button variant="outline" size="sm" onClick={() => handleSuspend(agreement.id)}>
                              Suspend
                            </Button>
                          )}
                          {agreement.lifecycle_status === 'suspended' && (
                            <Button variant="outline" size="sm" onClick={() => handleActivate(agreement.id)}>
                              Reactivate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No agreements found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Agreement Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create SaaS Agreement</DialogTitle>
            <DialogDescription>Set up a new fee agreement with a child organization</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            <div>
              <Label>Child Organization ID</Label>
              <Input
                value={formData.child_organization_id}
                onChange={(e) => setFormData(prev => ({ ...prev, child_organization_id: e.target.value }))}
                placeholder="Enter child org UUID"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Agreement Type</Label>
              <Select value={formData.agreement_type} onValueChange={(v) => setFormData(prev => ({ ...prev, agreement_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="saas_fee">SaaS Fee</SelectItem>
                  <SelectItem value="shadow_billing">Shadow Billing</SelectItem>
                  <SelectItem value="cost_sharing">Cost Sharing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fee Amount</Label>
                <Input
                  type="number"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, fee_amount: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={formData.fee_currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, fee_currency: e.target.value.toUpperCase() }))}
                  maxLength={3}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={formData.fee_frequency} onValueChange={(v) => setFormData(prev => ({ ...prev, fee_frequency: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shadow Charge Rate (%)</Label>
              <Input
                type="number"
                value={formData.shadow_charge_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, shadow_charge_rate: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.child_organization_id || createAgreement.isPending}>
              {createAgreement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
