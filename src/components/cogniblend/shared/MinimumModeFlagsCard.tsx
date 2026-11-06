/**
 * MinimumModeFlagsCard — "Regulated" and "IP-sensitive" brief flags (DEF-0144).
 * Either flag forces High-Rigor; the server refuses Submit / Complete Curation otherwise.
 */
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useMinimumModeFlags, useUpdateMinimumModeFlags } from '@/hooks/queries/useMinimumModeFlags';

interface MinimumModeFlagsCardProps {
  challengeId?: string;
  isReadOnly?: boolean;
}

export function MinimumModeFlagsCard({ challengeId, isReadOnly = false }: MinimumModeFlagsCardProps) {
  const { data, isLoading, isError, refetch } = useMinimumModeFlags(challengeId);
  const update = useUpdateMinimumModeFlags(challengeId);

  if (!challengeId) {
    return (
      <p className="text-xs text-muted-foreground">
        Save a draft to set the Regulated and IP-sensitive flags.
      </p>
    );
  }
  if (isLoading) return <Skeleton className="h-28 w-full" />;
  if (isError || !data) {
    return (
      <div className="text-xs text-destructive space-y-2">
        <p>Could not load challenge flags.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const isDisabled = isReadOnly || update.isPending;
  const rows = [
    { id: 'flag-regulated', label: 'Regulated', value: data.isRegulated,
      onChange: (v: boolean) => update.mutate({ ...data, isRegulated: v }) },
    { id: 'flag-ip-sensitive', label: 'IP-sensitive', value: data.isIpSensitive,
      onChange: (v: boolean) => update.mutate({ ...data, isIpSensitive: v }) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Minimum governance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          If either is Yes, the challenge must be High-Rigor. Large award pools also need a higher mode,
          using the limits set for the challenge's currency.
        </p>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between">
            <Label htmlFor={r.id} className="text-sm">{r.label}</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{r.value ? 'Yes' : 'No'}</span>
              <Switch id={r.id} checked={r.value} onCheckedChange={r.onChange} disabled={isDisabled} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
