/**
 * EmailTemplatesPage — Preview NOT_READY and READY email templates
 * Realistic rendered email with branded header bars, From/To/Subject, org details
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function EmailTemplatesPage() {
  const [activeTab, setActiveTab] = useState("not_ready");
  const navigate = useNavigate();

  return (
    <ErrorBoundary componentName="EmailTemplatesPage">
      <div className="space-y-6 p-6">
        {/* Back link */}
        <button
          onClick={() => navigate("/admin/marketplace/roles")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Role Management
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preview notification email templates for role readiness status changes.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="not_ready">NOT_READY Email</TabsTrigger>
            <TabsTrigger value="ready">READY Email</TabsTrigger>
          </TabsList>

          <TabsContent value="not_ready">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Email Meta */}
                <div className="px-6 py-3 border-b bg-muted/30 text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">From:</span> noreply@cogiblend.com</p>
                  <p><span className="font-medium text-foreground">To:</span> {"{{admin_email}}"}</p>
                  <p><span className="font-medium text-foreground">Subject:</span> Action Required: Role Gap Detected — {"{{challenge_title}}"}</p>
                </div>

                {/* Orange branded header */}
                <div className="bg-orange-600 px-6 py-4">
                  <p className="text-white font-bold text-lg">CogibleND</p>
                  <p className="text-orange-100 text-xs mt-0.5">Role Configuration Alert</p>
                </div>

                {/* Email body */}
                <div className="px-6 py-5 space-y-4 text-sm text-foreground">
                  <p>Dear {"{{admin_name}}"},</p>
                  <p className="text-muted-foreground">
                    Your organization's role configuration for the <strong>Marketplace</strong> engagement model
                    is currently <strong className="text-destructive">NOT READY</strong>. The following roles
                    are unassigned:
                  </p>

                  {/* Org details table */}
                  <div className="border rounded-md overflow-hidden text-xs">
                    <div className="grid grid-cols-2 border-b">
                      <div className="px-3 py-2 bg-muted/40 font-medium">Organization</div>
                      <div className="px-3 py-2">{"{{org_name}}"}</div>
                    </div>
                    <div className="grid grid-cols-2 border-b">
                      <div className="px-3 py-2 bg-muted/40 font-medium">Engagement Model</div>
                      <div className="px-3 py-2">Marketplace</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="px-3 py-2 bg-muted/40 font-medium">Status</div>
                      <div className="px-3 py-2 text-destructive font-medium">NOT READY</div>
                    </div>
                  </div>

                  {/* Missing roles list */}
                  <div>
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Unassigned Roles
                    </p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                      <li>Challenge Curator (R5_MP)</li>
                      <li>Innovation Director (R6_MP)</li>
                    </ul>
                  </div>

                  <p className="text-muted-foreground">
                    Please assign these roles to proceed with challenge creation. If you need assistance,
                    contact the platform administrator.
                  </p>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <div className="inline-block rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white">
                      Go to Role Management
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-muted/20 text-xs text-muted-foreground text-center">
                  © 2026 CogibleND. All rights reserved.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ready">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Email Meta */}
                <div className="px-6 py-3 border-b bg-muted/30 text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">From:</span> noreply@cogiblend.com</p>
                  <p><span className="font-medium text-foreground">To:</span> {"{{admin_email}}"}</p>
                  <p><span className="font-medium text-foreground">Subject:</span> Roles Complete — {"{{challenge_title}}"} May Proceed</p>
                </div>

                {/* Teal branded header */}
                <div className="bg-teal-600 px-6 py-4">
                  <p className="text-white font-bold text-lg">CogibleND</p>
                  <p className="text-teal-100 text-xs mt-0.5">Role Configuration Complete</p>
                </div>

                {/* Email body */}
                <div className="px-6 py-5 space-y-4 text-sm text-foreground">
                  <p>Dear {"{{admin_name}}"},</p>
                  <p className="text-muted-foreground">
                    Congratulations! Your organization's role configuration for the <strong>Marketplace</strong> engagement model
                    is now <strong className="text-green-600 dark:text-green-400">READY</strong>. All required roles have been filled.
                  </p>

                  {/* Org details table */}
                  <div className="border rounded-md overflow-hidden text-xs">
                    <div className="grid grid-cols-2 border-b">
                      <div className="px-3 py-2 bg-muted/40 font-medium">Organization</div>
                      <div className="px-3 py-2">{"{{org_name}}"}</div>
                    </div>
                    <div className="grid grid-cols-2 border-b">
                      <div className="px-3 py-2 bg-muted/40 font-medium">Engagement Model</div>
                      <div className="px-3 py-2">Marketplace</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="px-3 py-2 bg-muted/40 font-medium">Status</div>
                      <div className="px-3 py-2 text-green-600 dark:text-green-400 font-medium">READY</div>
                    </div>
                  </div>

                  {/* Filled roles list */}
                  <div>
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      All Roles Assigned
                    </p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                      <li>Challenge Architect (R3) — {"{{assignee_1}}"}</li>
                      <li>Challenge Curator (R5_MP) — {"{{assignee_2}}"}</li>
                      <li>Innovation Director (R6_MP) — {"{{assignee_3}}"}</li>
                      <li>Expert Reviewer (R7_MP) — {"{{assignee_4}}"}</li>
                    </ul>
                  </div>

                  <p className="text-muted-foreground">
                    You can now proceed with creating and managing challenges.
                  </p>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <div className="inline-block rounded-md bg-teal-600 px-6 py-2.5 text-sm font-medium text-white">
                      View Challenge
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-muted/20 text-xs text-muted-foreground text-center">
                  © 2026 CogibleND. All rights reserved.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
