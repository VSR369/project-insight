/**
 * Status pill + transition controls for an Enterprise agreement.
 * Platform admins only — RLS + DB FSM trigger enforce real authorization.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import {
  type AgreementStatus,
  useTransitionAgreementStatus,
} from '@/hooks/queries/useEnterpriseAgreement';

const NEXT_STATES: Record<AgreementStatus, AgreementStatus[]> = {
  draft: ['in_negotiation', 'terminated'],
  in_negotiation: ['signed', 'draft', 'terminated'],
  signed: ['active', 'terminated'],
  active: ['expired', 'terminated'],
  expired: [],
  terminated: [],
};

const LABEL: Record<AgreementStatus, string> = {
  draft: 'Draft',
  in_negotiation: 'In Negotiation',
  signed: 'Signed',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
};

interface Props {
  id: string;
  organizationId: string;
  status: AgreementStatus;
}

export function AgreementStatusControls({ id, organizationId, status }: Props) {
  const [pending, setPending] = useState<AgreementStatus | null>(null);
  const transition = useTransitionAgreementStatus();

  const next = NEXT_STATES[status] ?? [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant={status === 'active' ? 'default' : 'secondary'}>{LABEL[status]}</Badge>
      {next.map((target) => (
        <AlertDialog
          key={target}
          open={pending === target}
          onOpenChange={(open) => setPending(open ? target : null)}
        >
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">→ {LABEL[target]}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Transition to {LABEL[target]}?</AlertDialogTitle>
              <AlertDialogDescription>
                {target === 'active'
                  ? 'Activating this agreement will sync governance overrides to the organization and enforce the negotiated caps. Contract dates must be set.'
                  : `The agreement will be moved to "${LABEL[target]}". This is recorded in the audit trail.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={transition.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={transition.isPending}
                onClick={async () => {
                  await transition.mutateAsync({ id, organizationId, nextStatus: target });
                  setPending(null);
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </div>
  );
}
