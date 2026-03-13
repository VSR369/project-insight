/**
 * AdminDetailsTab — Displays current org admin info + admin change request form.
 * Part of Org Settings, read-only admin details with ability to request admin change.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  UserCircle, Lock, Mail, Phone, Building2, CalendarDays, Clock, Loader2, Send, AlertTriangle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInputSplit, formatPhoneIntl } from '@/components/ui/PhoneInputSplit';
import { Separator } from '@/components/ui/separator';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import {
  useOrgAdminDetails,
  useRequestAdminChange,
  usePendingAdminRequest,
} from '@/hooks/queries/useOrgAdminHooks';
import { AdminTransferSection } from './AdminTransferSection';

// ============================================================
// Validation
// ============================================================
const adminChangeSchema = z.object({
  new_admin_name: z.string().max(200).optional(),
  new_admin_email: z.string().email('Valid email required').min(1, 'Email is required'),
  new_admin_phone_country_code: z.string().optional().or(z.literal('')),
  new_admin_phone_number: z.string().max(15).optional().or(z.literal('')),
});

type AdminChangeFormValues = z.infer<typeof adminChangeSchema>;

// ============================================================
// Locked Field Display
// ============================================================
function LockedField({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
        <Lock className="h-3 w-3 text-muted-foreground/50" />
      </p>
      <p className="text-sm text-foreground font-mono bg-muted/50 rounded px-3 py-2 border border-border">
        {value || '—'}
      </p>
    </div>
  );
}

// ============================================================
// Component
// ============================================================
interface AdminDetailsTabProps {
  organizationId: string;
}

export function AdminDetailsTab({ organizationId }: AdminDetailsTabProps) {
  // ══════════════════════════════════════
  // SECTION 1: useState
  // ══════════════════════════════════════
  const [showChangeForm, setShowChangeForm] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Form
  // ══════════════════════════════════════
  const form = useForm<AdminChangeFormValues>({
    resolver: zodResolver(adminChangeSchema),
    defaultValues: { new_admin_name: '', new_admin_email: '', new_admin_phone: '' },
  });

  // ══════════════════════════════════════
  // SECTION 3: Queries
  // ══════════════════════════════════════
  const { data: adminDetails, isLoading: adminLoading } = useOrgAdminDetails(organizationId);
  const { data: pendingRequest, isLoading: pendingLoading } = usePendingAdminRequest(organizationId);
  const requestChange = useRequestAdminChange();

  // Query seeking_org_admins for the from_admin_id needed by transfer protocol
  const { data: seekingAdmin } = useQuery({
    queryKey: ['seeking_org_admin', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seeking_org_admins')
        .select('id')
        .eq('organization_id', organizationId!)
        .eq('admin_tier', 'PRIMARY')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ══════════════════════════════════════
  // SECTION 4: Handlers
  // ══════════════════════════════════════
  const handleSubmitChange = async (data: AdminChangeFormValues) => {
    try {
      await requestChange.mutateAsync({
        organization_id: organizationId,
        tenant_id: adminDetails?.tenant_id ?? organizationId,
        current_admin_user_id: adminDetails?.user_id ?? null,
        new_admin_name: data.new_admin_name || undefined,
        new_admin_email: data.new_admin_email,
        new_admin_phone: data.new_admin_phone || undefined,
      });
      form.reset();
      setShowChangeForm(false);
    } catch {
      // handled by mutation onError
    }
  };

  // ══════════════════════════════════════
  // SECTION 5: Loading
  // ══════════════════════════════════════
  if (adminLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatDate = (d: string | null | undefined) =>
    d ? format(new Date(d), 'PPP p') : '—';

  const statusVariant = (s: string | undefined): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (s) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'revoked': return 'destructive';
      default: return 'outline';
    }
  };

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Admin Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-5 w-5" />
            Organization Admin Details
          </CardTitle>
          <CardDescription>
            The primary administrator for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LockedField
              label="User ID"
              value={adminDetails?.user_id}
              icon={<Lock className="h-3 w-3" />}
            />
            <LockedField
              label="Full Name"
              value={adminDetails?.full_name}
              icon={<UserCircle className="h-3 w-3" />}
            />
            <LockedField
              label="Business Email"
              value={adminDetails?.email}
              icon={<Mail className="h-3 w-3" />}
            />
            <LockedField
              label="Phone Number"
              value={adminDetails?.phone}
              icon={<Phone className="h-3 w-3" />}
            />
            <LockedField
              label="Organization ID"
              value={adminDetails?.organization_id}
              icon={<Building2 className="h-3 w-3" />}
            />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <div className="px-3 py-2">
                <Badge variant={statusVariant(adminDetails?.invitation_status)}>
                  {adminDetails?.invitation_status ?? 'Unknown'}
                </Badge>
              </div>
            </div>
            <LockedField
              label="Activation Date"
              value={formatDate(adminDetails?.joined_at)}
              icon={<CalendarDays className="h-3 w-3" />}
            />
            <LockedField
              label="Created By"
              value={adminDetails?.created_by ?? 'System'}
              icon={<UserCircle className="h-3 w-3" />}
            />
            <LockedField
              label="Created At"
              value={formatDate(adminDetails?.created_at)}
              icon={<Clock className="h-3 w-3" />}
            />
            <LockedField
              label="Last Modified By"
              value={adminDetails?.updated_by}
              icon={<UserCircle className="h-3 w-3" />}
            />
            <LockedField
              label="Last Modified At"
              value={formatDate(adminDetails?.updated_at)}
              icon={<Clock className="h-3 w-3" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Request Banner */}
      {!pendingLoading && pendingRequest && (
      <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Admin Change Request Pending</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Transfer to <strong>{pendingRequest.new_admin_name || pendingRequest.new_admin_email}</strong>
                  {' '}({pendingRequest.new_admin_email}) is awaiting Platform Admin approval.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {formatDate(pendingRequest.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Admin Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Organization Admin</CardTitle>
          <CardDescription>
            Reassigning the admin role requires Platform Admin approval. New credentials will be issued by the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showChangeForm ? (
            <Button
              variant="outline"
              onClick={() => setShowChangeForm(true)}
              disabled={!!pendingRequest}
            >
              <Send className="h-4 w-4 mr-2" />
              {pendingRequest ? 'Change Already Requested' : 'Request Admin Change'}
            </Button>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitChange)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="new_admin_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Admin Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="new_admin_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Admin Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="admin@company.com" className="text-base" />
                      </FormControl>
                      <FormDescription>This will become the new admin's login email.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="new_admin_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Admin Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="Phone number" className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={requestChange.isPending}>
                    {requestChange.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Request
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowChangeForm(false); form.reset(); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
      {/* Transfer Primary Admin Section */}
      <AdminTransferSection
        organizationId={organizationId}
        fromAdminId={seekingAdmin?.id ?? null}
      />
    </div>
  );
}
