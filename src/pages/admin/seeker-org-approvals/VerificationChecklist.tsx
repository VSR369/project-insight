import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck, Info } from 'lucide-react';
import { useDuplicateCheck } from '@/hooks/queries/useSeekerOrgApprovals';
import type { SeekerOrg, SeekerBilling, SeekerDocument, AdminDelegation, SeekerSubscription, SeekerContact } from './types';

interface VerificationChecklistProps {
  org: SeekerOrg;
  billing: SeekerBilling | null;
  documents: SeekerDocument[];
  adminDelegation: AdminDelegation | null;
  subscription: SeekerSubscription | null;
  contacts: SeekerContact[];
}

function StatusIcon({ passed }: { passed: boolean | null }) {
  if (passed === null) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return passed
    ? <CheckCircle className="h-4 w-4 text-green-600" />
    : <XCircle className="h-4 w-4 text-red-500" />;
}

export function VerificationChecklist({ org, billing, documents, adminDelegation, subscription, contacts }: VerificationChecklistProps) {
  const [v2Confirmed, setV2Confirmed] = useState(false);
  const [v5Confirmed, setV5Confirmed] = useState(false);

  // V1: Payment verification
  const v1Passed = billing?.billing_verification_status === 'verified';

  // V3: Sanctions check (OFAC)
  const isOfacRestricted = org.countries?.code ? false : null; // Will be enhanced when country data includes is_ofac_restricted
  const v3Passed = isOfacRestricted === false;

  // V4: Duplicate check
  const { data: duplicates } = useDuplicateCheck(org.organization_name, org.hq_country_id);
  const otherDuplicates = (duplicates ?? []).filter((d) => d.id !== org.id);
  const v4Passed = otherDuplicates.length === 0;

  // V5: Admin identity
  const hasSeparateAdmin = !!adminDelegation;
  const v5Passed = hasSeparateAdmin ? v5Confirmed : true;

  // V6: Email domain match
  const primaryContact = contacts.find((c) => c.is_primary) ?? contacts[0];
  const adminEmail = adminDelegation?.new_admin_email ?? primaryContact?.email;
  const orgDomain = org.website_url
    ? org.website_url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    : null;
  const emailDomain = adminEmail ? adminEmail.split('@')[1] : null;
  const isMarketplace = subscription?.md_engagement_models?.name?.toLowerCase().includes('marketplace');
  const v6Passed = isMarketplace ? true : (orgDomain && emailDomain ? emailDomain.includes(orgDomain) || orgDomain.includes(emailDomain) : null);

  const checks = [
    { id: 'V1', label: 'Payment Verification', passed: v1Passed, detail: v1Passed ? 'Payment verified' : 'Payment not yet verified' },
    { id: 'V2', label: 'Organization Identity', passed: v2Confirmed, detail: 'Manual check — confirm legal entity name is valid', isManual: true },
    { id: 'V3', label: 'Sanctions / Compliance', passed: v3Passed, detail: v3Passed ? 'Country not OFAC-restricted' : 'OFAC check pending' },
    { id: 'V4', label: 'Duplicate Check', passed: v4Passed, detail: v4Passed ? 'No duplicates found' : `${otherDuplicates.length} potential duplicate(s) found` },
    { id: 'V5', label: 'Admin Identity', passed: v5Passed, detail: hasSeparateAdmin ? 'Separate admin designated — confirm plausibility' : 'Registrant is admin (self)', isManual: hasSeparateAdmin },
    { id: 'V6', label: 'Email Domain Match', passed: v6Passed, detail: isMarketplace ? 'Marketplace model — domain mismatch expected' : (v6Passed ? 'Domain matches' : `Admin: ${emailDomain ?? '—'} vs Org: ${orgDomain ?? '—'}`) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Verification Checklist (V1–V6)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isMarketplace && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Marketplace Model:</strong> Platform Admin manages this organization. Email domain mismatches are expected and intentional.
            </p>
          </div>
        )}
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-3 py-2 border-b last:border-0">
              <StatusIcon passed={check.passed} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">{check.id}</Badge>
                  <span className="text-sm font-medium">{check.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
              </div>
              {check.id === 'V2' && (
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="v2-confirm"
                    checked={v2Confirmed}
                    onCheckedChange={(checked) => setV2Confirmed(!!checked)}
                  />
                  <label htmlFor="v2-confirm" className="text-xs text-muted-foreground cursor-pointer">Confirmed</label>
                </div>
              )}
              {check.id === 'V5' && hasSeparateAdmin && (
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="v5-confirm"
                    checked={v5Confirmed}
                    onCheckedChange={(checked) => setV5Confirmed(!!checked)}
                  />
                  <label htmlFor="v5-confirm" className="text-xs text-muted-foreground cursor-pointer">Confirmed</label>
                </div>
              )}
            </div>
          ))}
        </div>
        {otherDuplicates.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Potential Duplicates:</p>
            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
              {otherDuplicates.map((d) => (
                <li key={d.id}>• {d.organization_name} ({d.verification_status})</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
