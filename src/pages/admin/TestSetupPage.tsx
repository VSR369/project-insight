/**
 * TestSetupPage — /admin/test-setup
 * Quick test scenario creation for Platform Admins.
 * Creates orgs, users, and role assignments for various governance models.
 */

import { useState } from 'react';
import {
  Loader2, CheckCircle2, AlertTriangle, Building2,
  Users, Zap, Shield, Copy, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/* ─── Scenario definitions ───────────────────────────────── */

interface ScenarioDef {
  key: string;
  title: string;
  description: string;
  model: string;
  governance: string;
  userCount: number;
  icon: React.ReactNode;
  badgeColor: string;
}

const SCENARIOS: ScenarioDef[] = [
  {
    key: 'mp_lightweight',
    title: 'MP Lightweight Org',
    description: 'Creates org + 1 user with all roles (CR, CU, ER, LC, FC)',
    model: 'Marketplace',
    governance: 'Lightweight',
    userCount: 1,
    icon: <Zap className="h-5 w-5" />,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    key: 'mp_enterprise_3',
    title: 'MP Enterprise Org with 3 Users',
    description: 'Creates org + 3 users with split roles (CR/CU, ID/ER, AM/FC)',
    model: 'Marketplace',
    governance: 'Enterprise',
    userCount: 3,
    icon: <Building2 className="h-5 w-5" />,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    key: 'agg_enterprise_8',
    title: 'AGG Enterprise Org with 8 Users',
    description: 'Creates org + 8 users each with 1 role (AM, CR, CU, ID, ER×2, FC, LC)',
    model: 'Aggregator',
    governance: 'Enterprise',
    userCount: 8,
    icon: <Users className="h-5 w-5" />,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    key: 'agg_lightweight_bypass',
    title: 'AGG Lightweight with Bypass',
    description: 'Creates org with phase1_bypass=true + 1 user with all roles',
    model: 'Aggregator',
    governance: 'Lightweight',
    userCount: 1,
    icon: <Shield className="h-5 w-5" />,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
];

/* ─── Credential result type ─────────────────────────────── */

interface ScenarioResult {
  orgId: string;
  orgName: string;
  credentials: { email: string; password: string; roles: string[] }[];
  results: string[];
}

/* ─── Component ──────────────────────────────────────────── */

export default function TestSetupPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [completedResults, setCompletedResults] = useState<Record<string, ScenarioResult>>({});
  const [showPasswords, setShowPasswords] = useState(false);

  const handleRunScenario = async (scenarioKey: string) => {
    setLoading(scenarioKey);
    try {
      const { data, error } = await supabase.functions.invoke('setup-test-scenario', {
        body: { scenario: scenarioKey },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error?.message ?? 'Unknown error');

      setCompletedResults((prev) => ({
        ...prev,
        [scenarioKey]: {
          orgId: data.data.orgId,
          orgName: data.data.orgName,
          credentials: data.data.credentials,
          results: data.data.results,
        },
      }));

      toast.success(`Scenario "${scenarioKey}" created successfully`);
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const copyCredentials = (result: ScenarioResult) => {
    const text = result.credentials
      .map((c) => `${c.email} / ${c.password}  [${c.roles.join(', ')}]`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Test Scenario Setup</h1>
        <p className="text-sm text-muted-foreground">
          Quickly create test organizations with pre-configured users and role assignments.
          Each scenario creates an org, auth users, and assigns CogniBlend governance roles.
        </p>
      </div>

      <Separator />

      {/* Scenario cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SCENARIOS.map((scenario) => {
          const result = completedResults[scenario.key];
          const isLoading = loading === scenario.key;

          return (
            <Card key={scenario.key} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 text-primary">
                    {scenario.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-sm font-bold text-foreground leading-tight">
                      {scenario.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {/* Meta badges */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={`text-[10px] font-semibold border ${scenario.badgeColor} hover:opacity-90`}>
                    {scenario.model}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {scenario.governance}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {scenario.userCount} user{scenario.userCount > 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Action button */}
                {!result ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleRunScenario(scenario.key)}
                    disabled={!!loading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      'Create Scenario'
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {/* Success header */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Created successfully
                    </div>

                    {/* Credentials table */}
                    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Login Credentials
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => setShowPasswords(!showPasswords)}
                          >
                            {showPasswords ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => copyCredentials(result)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {result.credentials.map((cred, i) => (
                          <div key={i} className="px-3 py-2 space-y-0.5">
                            <p className="text-xs font-mono font-medium text-foreground">
                              {cred.email}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              {showPasswords ? cred.password : '••••••••••••'}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {cred.roles.map((role) => (
                                <Badge key={role} variant="outline" className="text-[9px] font-bold px-1.5 py-0">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Org ID */}
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      Org ID: {result.orgId}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Development Use Only</p>
          <p>
            These scenarios create real auth users and database records.
            Use only in development/staging environments. All test users share the
            password <code className="font-mono bg-amber-100 px-1 rounded">TestSetup2026!</code>
          </p>
        </div>
      </div>

      <div className="pb-8" />
    </div>
  );
}
