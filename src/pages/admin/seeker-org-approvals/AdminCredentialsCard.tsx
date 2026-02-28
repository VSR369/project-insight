import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { useSendWelcomeEmail } from '@/hooks/queries/useSeekerOrgApprovals';
import type { OrgUser, SeekerOrg, SeekerContact } from './types';

interface AdminCredentialsCardProps {
  orgUsers: OrgUser[];
  org: SeekerOrg;
  contacts: SeekerContact[];
}

export function AdminCredentialsCard({ orgUsers, org, contacts }: AdminCredentialsCardProps) {
  const sendEmail = useSendWelcomeEmail();
  const [showPassword, setShowPassword] = useState(false);

  // Placeholder: stabilize temp password within session via useMemo.
  // TODO: Replace with proper credential management (server-generated, hashed, single-use).
  const tempPassword = useMemo(
    () => `Temp${org.id.slice(0, 4)}!${Math.random().toString(36).slice(2, 6)}`,
    [org.id]
  );

  const adminUser = orgUsers.find((u) => u.role === 'tenant_admin') ?? orgUsers[0];

  // Resolve admin email from contacts (primary contact email) instead of user_id UUID
  const adminEmail = useMemo(() => {
    if (!adminUser) return null;
    const primaryContact = contacts.find((c) => c.is_primary);
    return primaryContact?.email ?? contacts[0]?.email ?? null;
  }, [adminUser, contacts]);

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

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Temporary Password</p>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                {showPassword ? tempPassword : '••••••••••••'}
              </p>
            </div>

            <Button
              onClick={() => {
                if (!adminEmail) return;
                sendEmail.mutate({
                  orgId: org.id,
                  adminEmail,
                  orgName: org.organization_name,
                  tempPassword,
                });
              }}
              disabled={sendEmail.isPending || org.verification_status !== 'verified' || !adminEmail}
            >
              {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              Send Welcome Email
            </Button>
            {org.verification_status !== 'verified' && (
              <p className="text-xs text-muted-foreground">Organization must be verified before sending welcome email.</p>
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
