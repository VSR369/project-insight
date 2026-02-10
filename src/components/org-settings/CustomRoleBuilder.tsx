/**
 * Custom Role Builder (TEM-001)
 * 
 * UI for creating custom roles with granular permissions.
 * Available only on Premium tier.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Shield, Plus, Loader2 } from 'lucide-react';

const PERMISSION_GROUPS = {
  challenges: {
    label: 'Challenges',
    permissions: [
      { key: 'challenges.create', label: 'Create challenges' },
      { key: 'challenges.edit', label: 'Edit challenges' },
      { key: 'challenges.delete', label: 'Delete challenges' },
      { key: 'challenges.view_all', label: 'View all challenges' },
      { key: 'challenges.award', label: 'Award solutions' },
    ],
  },
  team: {
    label: 'Team',
    permissions: [
      { key: 'team.invite', label: 'Invite members' },
      { key: 'team.remove', label: 'Remove members' },
      { key: 'team.change_roles', label: 'Change member roles' },
    ],
  },
  billing: {
    label: 'Billing',
    permissions: [
      { key: 'billing.view', label: 'View billing info' },
      { key: 'billing.manage', label: 'Manage subscriptions' },
      { key: 'billing.topup', label: 'Purchase top-ups' },
    ],
  },
  settings: {
    label: 'Settings',
    permissions: [
      { key: 'settings.view', label: 'View organization settings' },
      { key: 'settings.edit', label: 'Edit organization settings' },
      { key: 'settings.audit', label: 'View audit trail' },
    ],
  },
} as const;

const customRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(50, 'Role name must be 50 characters or less'),
  description: z.string().trim().max(200).optional().or(z.literal('')),
});

type CustomRoleFormValues = z.infer<typeof customRoleSchema>;

interface CustomRoleBuilderProps {
  isPremium: boolean;
  existingRoles?: { id: string; name: string; is_system_role: boolean; description?: string | null }[];
  onCreateRole?: (role: { name: string; description?: string; permissions: string[] }) => void;
  isCreating?: boolean;
}

export function CustomRoleBuilder({
  isPremium,
  existingRoles = [],
  onCreateRole,
  isCreating = false,
}: CustomRoleBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const form = useForm<CustomRoleFormValues>({
    resolver: zodResolver(customRoleSchema),
    defaultValues: { name: '', description: '' },
  });

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (groupKey: string) => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return;
    const allKeys = group.permissions.map((p) => p.key);
    const allSelected = allKeys.every((k) => selectedPermissions.has(k));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      allKeys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const handleSubmit = (data: CustomRoleFormValues) => {
    if (selectedPermissions.size === 0) return;
    onCreateRole?.({
      name: data.name,
      description: data.description || undefined,
      permissions: Array.from(selectedPermissions),
    });
    setDialogOpen(false);
    form.reset();
    setSelectedPermissions(new Set());
  };

  if (!isPremium) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Custom Roles</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upgrade to Premium to create custom roles with granular permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Custom Roles
              </CardTitle>
              <CardDescription>Create roles with specific permissions for your team</CardDescription>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {existingRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom roles created yet.
            </p>
          ) : (
            <div className="space-y-2">
              {existingRoles.map((role) => (
                <div key={role.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <span className="font-medium text-sm text-foreground">{role.name}</span>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                  <Badge variant={role.is_system_role ? 'secondary' : 'outline'} className="text-xs">
                    {role.is_system_role ? 'System' : 'Custom'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>Define a role with specific permissions</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-4">
            <Form {...form}>
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Challenge Manager" className="text-base" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input {...field} placeholder="Brief description" className="text-base" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator />

                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">Permissions</p>
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                    const allKeys = group.permissions.map((p) => p.key);
                    const allSelected = allKeys.every((k) => selectedPermissions.has(k));
                    const someSelected = allKeys.some((k) => selectedPermissions.has(k));

                    return (
                      <div key={groupKey} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            // indeterminate not natively supported, using checked state
                            onCheckedChange={() => toggleGroup(groupKey)}
                          />
                          <span className="text-sm font-medium text-foreground">{group.label}</span>
                          {someSelected && !allSelected && (
                            <Badge variant="secondary" className="text-xs">Partial</Badge>
                          )}
                        </div>
                        <div className="ml-6 space-y-1.5">
                          {group.permissions.map((perm) => (
                            <div key={perm.key} className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedPermissions.has(perm.key)}
                                onCheckedChange={() => togglePermission(perm.key)}
                              />
                              <span className="text-sm text-muted-foreground">{perm.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Form>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isCreating || selectedPermissions.size === 0}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
