/**
 * GovernanceProfileTab — Displays current governance profile and allows
 * one-way upgrade from Lightweight → Enterprise.
 *
 * Per BRD: Enterprise → Lightweight downgrade is not permitted.
 */

import { useState } from 'react';
import { ShieldCheck, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface GovernanceProfileTabProps {
  organizationId: string;
}

const ENTERPRISE_BENEFITS = [
  'Separate role assignments required for each challenge phase',
  'Full legal document suite attached to every challenge',
  'All 13 lifecycle phases active with manual gate enforcement',
  '3-tier access model: Organization → Challenge → Phase-level',
  'Weighted screening with anonymous solver evaluation',
  'Material amendment governance with withdrawal windows',
] as const;

export function GovernanceProfileTab({ organizationId }: GovernanceProfileTabProps) {
  const { data: currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const profile = currentOrg?.governanceProfile ?? 'LIGHTWEIGHT';
  const isEnterprise = profile === 'ENTERPRISE';

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const updateData = await withUpdatedBy({
        governance_profile: 'ENTERPRISE',
        updated_at: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', organizationId);

      if (error) throw new Error(error.message);

      queryClient.invalidateQueries({ queryKey: ['current-org'] });
      toast.success('Profile upgraded. New challenges will use Enterprise governance. Existing challenges are not affected.');
      setModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upgrade failed';
      toast.error(`Failed to upgrade: ${message}`);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Governance Profile
        </CardTitle>
        <CardDescription>
          Controls how challenges are structured, reviewed, and governed within your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current profile badge — large */}
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium text-muted-foreground">Current Profile</span>
          <GovernanceProfileBadge profile={profile} />
        </div>

        {/* Enterprise active state */}
        {isEnterprise ? (
          <div className="flex items-center gap-2 text-sm font-medium text-[hsl(145,50%,38%)]">
            <CheckCircle2 className="h-4.5 w-4.5" />
            Enterprise governance active
          </div>
        ) : (
          /* Upgrade button for Lightweight */
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            onClick={() => setModalOpen(true)}
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Upgrade to Enterprise
          </Button>
        )}

        {/* Info text */}
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
          {isEnterprise
            ? 'Your organization uses full Enterprise governance. All new challenges will follow strict phase gating, role assignments, and legal requirements.'
            : 'Lightweight governance uses simplified workflows with fewer mandatory fields and auto-completed phases. Upgrade to Enterprise for full control.'}
        </p>
      </CardContent>

      {/* Upgrade confirmation modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Upgrade to Enterprise Governance
            </DialogTitle>
            <DialogDescription>
              This is a one-way upgrade. You cannot downgrade back to Lightweight after confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            <p className="text-sm text-foreground font-medium">
              Enterprise governance enables:
            </p>
            <ul className="space-y-2.5">
              {ENTERPRISE_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-md border border-[hsl(38,60%,70%)] bg-[hsl(38,60%,96%)] p-3 text-xs text-[hsl(38,55%,30%)]">
              <strong>Note:</strong> Existing challenges will continue using their current governance profile.
              Only new challenges created after the upgrade will use Enterprise governance.
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={upgrading}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={upgrading}>
              {upgrading ? 'Upgrading…' : 'Confirm Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
