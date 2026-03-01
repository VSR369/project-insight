import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Mail, Loader2, Eye, EyeOff, Users, AlertTriangle } from 'lucide-react';
import { useSendWelcomeEmail } from '@/hooks/queries/useSeekerOrgApprovals';
import type { OrgUser, SeekerOrg, SeekerContact, AdminDelegation } from './types';

interface AdminCredentialsCardProps {
  orgUsers: OrgUser[];
  org: SeekerOrg;
  contacts: SeekerContact[];
  adminDelegation: AdminDelegation | null;
}

export function AdminCredentialsCard({ orgUsers, org, contacts, adminDelegation }: AdminCredentialsCardProps) {
  const sendEmail = useSendWelcomeEmail();
  const [showPassword, setShowPassword] = useState(false);
  const [registrantEmailSent, setRegistrantEmailSent] = useState(false);
  const [adminEmailSent, setAdminEmailSent] = useState(false);
  const [selfEmailSent, setSelfEmailSent] = useState(false);

  const tempPassword = useMemo(() => {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    const rand = Array.from(array, (b) => b.toString(36)).join('').slice(0, 8);
    return `Temp${org.id.slice(0, 4)}!${rand}`;
  }, [org.id]);

  const adminUser = orgUsers.find((u) => u.role === 'tenant_admin') ?? orgUsers[0];
  const primaryContact = contacts.find((c) => c.is_primary) ?? contacts[0];
  const registrantEmail = primaryContact?.email ?? null;

  const isSeparateAdmin = !!adminDelegation;
  const adminEmail = isSeparateAdmin ? adminDelegation.new_admin_email : registrantEmail;

  const isNotVerified = org.verification_status !== 'verified';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Admin Credentials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!adminUser ? (
          <p className="text-sm text-muted-foreground">No admin user found for this organization.</p>
        ) : (
          <>
            {/* Admin info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Admin Email</p>
                <p className="text-sm font-mono">{adminEmail ?? 'Not available'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <Badge variant="secondary">{adminUser.role}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={adminUser.is_active ? 'default' : 'destructive'}>
                  {adminUser.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Delegation info */}
            {isSeparateAdmin && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Separate Admin Designated</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Admin Name</span>
                    <p>{adminDelegation.new_admin_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Admin Email</span>
                    <p className="font-mono">{adminDelegation.new_admin_email}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Admin Phone</span>
                    <p>{adminDelegation.new_admin_phone || '—'}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registrant ({registrantEmail}) will receive approval confirmation. Admin credentials will be sent to {adminDelegation.new_admin_email}.
                </p>
              </div>
            )}

            {/* Temp password (only for admin recipient) */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Temporary Password {isSeparateAdmin && '(for admin)'}</p>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                {showPassword ? tempPassword : '••••••••••••'}
              </p>
            </div>

            {/* Send email buttons */}
            {isSeparateAdmin ? (
              <div className="flex flex-col lg:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!registrantEmail) return;
                    sendEmail.mutate({
                      orgId: org.id,
                      adminEmail: registrantEmail,
                      orgName: org.organization_name,
                      mode: 'registrant_only',
                      adminName: adminDelegation.new_admin_name ?? undefined,
                    }, { onSuccess: () => setRegistrantEmailSent(true) });
                  }}
                  disabled={sendEmail.isPending || isNotVerified || !registrantEmail || registrantEmailSent}
                >
                  {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
                  {registrantEmailSent ? 'Sent to Registrant ✓' : `Send Approval Email to Registrant`}
                </Button>
                <Button
                  onClick={() => {
                    sendEmail.mutate({
                      orgId: org.id,
                      adminEmail: adminDelegation.new_admin_email,
                      orgName: org.organization_name,
                      tempPassword,
                      mode: 'admin_only',
                    }, { onSuccess: () => setAdminEmailSent(true) });
                  }}
                  disabled={sendEmail.isPending || isNotVerified || adminEmailSent}
                >
                  {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
                  {adminEmailSent ? 'Sent to Admin ✓' : `Send Credentials to ${adminDelegation.new_admin_email}`}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  if (!adminEmail) return;
                  sendEmail.mutate({
                    orgId: org.id,
                    adminEmail,
                    orgName: org.organization_name,
                    tempPassword,
                    mode: 'self',
                  }, { onSuccess: () => setSelfEmailSent(true) });
                }}
                disabled={sendEmail.isPending || isNotVerified || !adminEmail || selfEmailSent}
              >
                {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
                {selfEmailSent ? 'Welcome Email Sent ✓' : 'Send Welcome Email'}
              </Button>
            )}

            {isNotVerified && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Organization must be verified before sending welcome email.
              </p>
            )}
            {!adminEmail && (
              <p className="text-xs text-destructive">No email address found for admin user. Add a primary contact first.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
