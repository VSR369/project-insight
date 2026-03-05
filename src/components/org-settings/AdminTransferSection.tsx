/**
 * AdminTransferSection — "Transfer Primary Admin" card for AdminDetailsTab.
 * Creates records in admin_transfer_requests (BR-SOA-010).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ArrowRightLeft, AlertTriangle, Loader2, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';

import {
  usePendingTransferRequest,
  useRequestAdminTransfer,
  useCancelTransferRequest,
} from '@/hooks/queries/useAdminTransferHooks';

// ============================================================
// Validation
// ============================================================
const transferSchema = z.object({
  to_admin_email: z.string().email('Valid email required').min(1, 'Email is required'),
  to_admin_name: z.string().max(200).optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

// ============================================================
// Component
// ============================================================
interface AdminTransferSectionProps {
  organizationId: string;
  fromAdminId: string | null;
}

export function AdminTransferSection({ organizationId, fromAdminId }: AdminTransferSectionProps) {
  const [showForm, setShowForm] = useState(false);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { to_admin_email: '', to_admin_name: '' },
  });

  const { data: pendingTransfer, isLoading: pendingLoading } = usePendingTransferRequest(organizationId);
  const requestTransfer = useRequestAdminTransfer();
  const cancelTransfer = useCancelTransferRequest();

  const handleSubmit = async (data: TransferFormValues) => {
    if (!fromAdminId) return;
    try {
      await requestTransfer.mutateAsync({
        organization_id: organizationId,
        from_admin_id: fromAdminId,
        to_admin_email: data.to_admin_email,
        to_admin_name: data.to_admin_name || undefined,
      });
      form.reset();
      setShowForm(false);
    } catch {
      // handled by mutation onError
    }
  };

  const handleCancel = async () => {
    if (!pendingTransfer) return;
    await cancelTransfer.mutateAsync({ id: pendingTransfer.id, organization_id: organizationId });
  };

  const formatDate = (d: string | null | undefined) =>
    d ? format(new Date(d), 'PPP p') : '—';

  return (
    <>
      {/* Pending Transfer Banner */}
      {!pendingLoading && pendingTransfer && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Admin Transfer Request Pending</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Transfer to <strong>{pendingTransfer.to_admin_name || pendingTransfer.to_admin_email}</strong>
                  {' '}({pendingTransfer.to_admin_email}) is awaiting Platform Admin approval.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {formatDate(pendingTransfer.created_at)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive hover:text-destructive"
                  onClick={handleCancel}
                  disabled={cancelTransfer.isPending}
                >
                  {cancelTransfer.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  Cancel Request
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Admin Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Primary Admin
          </CardTitle>
          <CardDescription>
            Formally transfer the primary admin role to another person. Requires Platform Admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              disabled={!!pendingTransfer || !fromAdminId}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {pendingTransfer ? 'Transfer Already Requested' : !fromAdminId ? 'No Admin Record Found' : 'Request Admin Transfer'}
            </Button>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="to_admin_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Admin Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="newadmin@company.com" className="text-base" />
                      </FormControl>
                      <FormDescription>The email for the new primary admin.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="to_admin_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Admin Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name (optional)" className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={requestTransfer.isPending}>
                    {requestTransfer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Transfer Request
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowForm(false); form.reset(); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
