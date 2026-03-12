/**
 * OrgEmailTemplatesPage — Thin wrapper reusing EmailTemplatesPage logic
 * Route: /org/email-templates
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail } from 'lucide-react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useSlmRoleCodes } from '@/hooks/queries/useSlmRoleCodes';
import { useEngagementModels } from '@/hooks/queries/useEngagementModels';
import { useAdminContact } from '@/hooks/queries/useAdminContact';

export default function OrgEmailTemplatesPage() {
  const [activeTab, setActiveTab] = useState('not_ready');
  const navigate = useNavigate();

  const { data: allRoles, isLoading: rolesLoading } = useSlmRoleCodes();
  const { data: engagementModels, isLoading: modelsLoading } = useEngagementModels();
  const { data: adminContact, isLoading: contactLoading } = useAdminContact();

  const isLoading = rolesLoading || modelsLoading || contactLoading;

  const aggRoles = (allRoles ?? []).filter(
    (r) => !r.is_core && (r.model_applicability === 'agg')
  );
  const coreRoles = (allRoles ?? []).filter((r) => r.is_core);
  const aggModel = engagementModels?.find((m) => m.code === 'aggregator');
  const modelName = aggModel?.name ?? 'Aggregator';
  const contactName = adminContact?.name ?? '{{admin_name}}';
  const contactEmail = adminContact?.email ?? '{{admin_email}}';

  return (
    <FeatureErrorBoundary featureName="OrgEmailTemplatesPage">
      <div className="space-y-6 p-6">
        <button
          onClick={() => navigate('/org/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preview notification email templates for role readiness status changes.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="not_ready">NOT_READY Email</TabsTrigger>
              <TabsTrigger value="ready">READY Email</TabsTrigger>
            </TabsList>

            <TabsContent value="not_ready">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-6 py-3 border-b bg-muted/30 text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">From:</span> noreply@cogiblend.com</p>
                    <p><span className="font-medium text-foreground">To:</span> {contactEmail}</p>
                    <p><span className="font-medium text-foreground">Subject:</span> Action Required: Role Gap Detected — {'{{challenge_title}}'}</p>
                  </div>
                  <div className="bg-orange-600 px-6 py-4">
                    <p className="text-white font-bold text-lg">CogibleND</p>
                    <p className="text-orange-100 text-xs mt-0.5">Role Configuration Alert</p>
                  </div>
                  <div className="px-6 py-5 space-y-4 text-sm text-foreground">
                    <p>Dear {contactName},</p>
                    <p className="text-muted-foreground">
                      Your organization's role configuration for the <strong>{modelName}</strong> engagement model
                      is currently <strong className="text-destructive">NOT READY</strong>. The following roles are unassigned:
                    </p>
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">Unassigned Roles</p>
                      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                        {aggRoles.length > 0 ? aggRoles.map((role) => (
                          <li key={role.code}>{role.display_name} ({role.code}) — min required: {role.min_required}</li>
                        )) : <li className="italic">No aggregator roles found</li>}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">Core Roles (always required)</p>
                      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                        {coreRoles.map((role) => (
                          <li key={role.code}>{role.display_name} ({role.code})</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-muted-foreground">Please assign these roles to proceed with challenge creation.</p>
                    <div className="pt-2">
                      <div className="inline-block rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white">Go to Role Management</div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t bg-muted/20 text-xs text-muted-foreground text-center">
                    © {new Date().getFullYear()} CogibleND. All rights reserved.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ready">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-6 py-3 border-b bg-muted/30 text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">From:</span> noreply@cogiblend.com</p>
                    <p><span className="font-medium text-foreground">To:</span> {contactEmail}</p>
                    <p><span className="font-medium text-foreground">Subject:</span> Roles Complete — {'{{challenge_title}}'} May Proceed</p>
                  </div>
                  <div className="bg-teal-600 px-6 py-4">
                    <p className="text-white font-bold text-lg">CogibleND</p>
                    <p className="text-teal-100 text-xs mt-0.5">Role Configuration Complete</p>
                  </div>
                  <div className="px-6 py-5 space-y-4 text-sm text-foreground">
                    <p>Dear {contactName},</p>
                    <p className="text-muted-foreground">
                      Congratulations! Your organization's role configuration for the <strong>{modelName}</strong> engagement model
                      is now <strong className="text-green-600 dark:text-green-400">READY</strong>. All required roles have been filled.
                    </p>
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">All Roles Assigned</p>
                      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                        {[...coreRoles, ...mpRoles].map((role) => (
                          <li key={role.code}>{role.display_name} ({role.code}) — {'{{assignee}}'}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-muted-foreground">You can now proceed with creating and managing challenges.</p>
                    <div className="pt-2">
                      <div className="inline-block rounded-md bg-teal-600 px-6 py-2.5 text-sm font-medium text-white">View Challenge</div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t bg-muted/20 text-xs text-muted-foreground text-center">
                    © {new Date().getFullYear()} CogibleND. All rights reserved.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </FeatureErrorBoundary>
  );
}
