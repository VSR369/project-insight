/**
 * EnterpriseAgreementCard — Read-only summary of the org's active
 * Enterprise agreement. Shown to PRIMARY admins of orgs on the
 * `enterprise` tier. No edit affordances — RLS would deny writes anyway.
 */

import { Crown, FileText, Calendar, Coins, Users, HardDrive, Trophy, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  useActiveEnterpriseAgreement,
  useEnterpriseFeatureGateKeys,
} from '@/hooks/queries/useEnterpriseAgreement';

interface Props {
  organizationId: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_negotiation: 'In Negotiation',
  signed: 'Signed',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
};

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return format(new Date(d), 'PP');
  } catch {
    return '—';
  }
}

function formatCurrency(amount: number | null | undefined, code: string | null | undefined): string {
  if (amount == null || !code) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString()}`;
  }
}

export function EnterpriseAgreementCard({ organizationId }: Props) {
  const { data: agreement, isLoading } = useActiveEnterpriseAgreement(organizationId);
  const { data: gateKeys } = useEnterpriseFeatureGateKeys();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!agreement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Enterprise Agreement
          </CardTitle>
          <CardDescription>
            No active Enterprise agreement is on file for this organization.
            Contact your account manager to start a contract.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const gates = (agreement.feature_gates ?? {}) as Record<string, boolean>;
  const enabledGates = gateKeys?.filter((g) => gates[g.key] === true) ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Enterprise Agreement
            </CardTitle>
            <CardDescription>
              Negotiated terms governing your subscription. Read-only — contact
              your account manager to amend.
            </CardDescription>
          </div>
          <Badge variant={agreement.agreement_status === 'active' ? 'default' : 'secondary'}>
            {STATUS_LABEL[agreement.agreement_status ?? ''] ?? agreement.agreement_status ?? '—'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Commercial */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Stat icon={<Coins className="h-4 w-4" />} label="Annual Contract Value"
            value={formatCurrency(agreement.acv_amount, agreement.currency_code)} />
          <Stat icon={<FileText className="h-4 w-4" />} label="Billing Cadence"
            value={agreement.billing_cadence ?? '—'} />
          <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Tier"
            value={agreement.tier_name ?? agreement.tier_code ?? '—'} />
        </section>

        <Separator />

        {/* Term */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Stat icon={<Calendar className="h-4 w-4" />} label="Contract Start"
            value={formatDate(agreement.contract_start_date)} />
          <Stat icon={<Calendar className="h-4 w-4" />} label="Contract End"
            value={formatDate(agreement.contract_end_date)} />
          <Stat icon={<Calendar className="h-4 w-4" />} label="Signed"
            value={formatDate(agreement.signed_at)} />
        </section>

        <Separator />

        {/* Overrides */}
        <section>
          <h4 className="text-sm font-semibold mb-3">Effective Overrides</h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Stat icon={<Trophy className="h-4 w-4" />} label="Max Challenges"
              value={agreement.max_challenges_override?.toLocaleString() ?? 'Tier default'} />
            <Stat icon={<Users className="h-4 w-4" />} label="Max Users"
              value={agreement.max_users_override?.toLocaleString() ?? 'Tier default'} />
            <Stat icon={<HardDrive className="h-4 w-4" />} label="Max Storage"
              value={agreement.max_storage_gb_override
                ? `${agreement.max_storage_gb_override} GB`
                : 'Tier default'} />
          </div>
          {agreement.governance_mode_override && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Governance Mode Override: </span>
              <Badge variant="outline">{agreement.governance_mode_override}</Badge>
            </div>
          )}
        </section>

        <Separator />

        {/* Feature gates */}
        <section>
          <h4 className="text-sm font-semibold mb-3">Enabled Capabilities</h4>
          {enabledGates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No capability gates enabled.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enabledGates.map((g) => (
                <Badge key={g.key} variant="secondary" title={g.description ?? undefined}>
                  {g.display_name}
                </Badge>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
