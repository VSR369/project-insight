/**
 * EmailTemplatesPage — Preview NOT_READY and READY email templates
 * Uses placeholder variables — no hardcoded role names
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function EmailTemplatesPage() {
  const [activeTab, setActiveTab] = useState("not_ready");

  return (
    <ErrorBoundary componentName="EmailTemplatesPage">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            Platform Admin &gt; Marketplace &gt; Email Templates
          </nav>
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
            <TabsTrigger value="not_ready" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              NOT READY
            </TabsTrigger>
            <TabsTrigger value="ready" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              READY
            </TabsTrigger>
          </TabsList>

          <TabsContent value="not_ready">
            <Card>
              <CardHeader className="bg-amber-50 dark:bg-amber-900/20 border-b">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-base text-amber-800 dark:text-amber-300">
                    Role Configuration Incomplete
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="bg-muted/50 rounded-lg p-5 border">
                    <p className="text-sm text-foreground mb-3">
                      <strong>Subject:</strong> Action Required — Role Configuration Incomplete for{" "}
                      <Badge variant="outline" className="text-xs">{"{{org_name}}"}</Badge>
                    </p>
                    <hr className="my-3 border-border" />
                    <p className="text-sm text-foreground">Dear <Badge variant="outline" className="text-xs">{"{{admin_name}}"}</Badge>,</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your organization's role configuration for the{" "}
                      <Badge variant="outline" className="text-xs">{"{{engagement_model}}"}</Badge>{" "}
                      model is currently <strong className="text-destructive">NOT READY</strong>.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      The following roles still need to be assigned:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-1 list-disc pl-5">
                      <li><Badge variant="outline" className="text-xs">{"{{missing_role_1}}"}</Badge></li>
                      <li><Badge variant="outline" className="text-xs">{"{{missing_role_2}}"}</Badge></li>
                      <li><Badge variant="outline" className="text-xs">{"{{missing_role_n}}"}</Badge></li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-3">
                      Please assign these roles to proceed with challenge creation. If you need assistance,
                      contact the platform administrator:
                    </p>
                    <div className="mt-2 bg-background rounded p-3 border text-sm">
                      <p><strong>Name:</strong> <Badge variant="outline" className="text-xs">{"{{admin_contact_name}}"}</Badge></p>
                      <p><strong>Email:</strong> <Badge variant="outline" className="text-xs">{"{{admin_contact_email}}"}</Badge></p>
                      <p><strong>Phone:</strong> <Badge variant="outline" className="text-xs">{"{{admin_contact_phone}}"}</Badge></p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Best regards,<br />
                      <Badge variant="outline" className="text-xs">{"{{platform_name}}"}</Badge> Team
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ready">
            <Card>
              <CardHeader className="bg-green-50 dark:bg-green-900/20 border-b">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base text-green-800 dark:text-green-300">
                    Role Configuration Complete
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="bg-muted/50 rounded-lg p-5 border">
                    <p className="text-sm text-foreground mb-3">
                      <strong>Subject:</strong> ✅ Role Configuration Complete for{" "}
                      <Badge variant="outline" className="text-xs">{"{{org_name}}"}</Badge>
                    </p>
                    <hr className="my-3 border-border" />
                    <p className="text-sm text-foreground">Dear <Badge variant="outline" className="text-xs">{"{{admin_name}}"}</Badge>,</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Congratulations! Your organization's role configuration for the{" "}
                      <Badge variant="outline" className="text-xs">{"{{engagement_model}}"}</Badge>{" "}
                      model is now <strong className="text-green-600 dark:text-green-400">READY</strong>.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      All required roles have been filled:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-1 list-disc pl-5">
                      <li><Badge variant="outline" className="text-xs">{"{{filled_role_1}}"}</Badge> — assigned to <Badge variant="outline" className="text-xs">{"{{assignee_1}}"}</Badge></li>
                      <li><Badge variant="outline" className="text-xs">{"{{filled_role_2}}"}</Badge> — assigned to <Badge variant="outline" className="text-xs">{"{{assignee_2}}"}</Badge></li>
                      <li><Badge variant="outline" className="text-xs">{"{{filled_role_n}}"}</Badge> — assigned to <Badge variant="outline" className="text-xs">{"{{assignee_n}}"}</Badge></li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-3">
                      You can now proceed with creating and managing challenges.
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">
                      Best regards,<br />
                      <Badge variant="outline" className="text-xs">{"{{platform_name}}"}</Badge> Team
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
