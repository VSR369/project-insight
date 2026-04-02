/**
 * CogniLoginDevTools — Developer tools section for CogniLogin page.
 * Extracted from CogniLoginPage.tsx.
 */

import { useState } from 'react';
import { Loader2, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickUser {
  email: string;
  label: string;
  roles: string[];
}

const MP_QUICK_USERS: QuickUser[] = [
  { email: 'mp-solo@cognitest.dev',      label: 'Solo Founder',  roles: ['CR','CU','ER','LC','FC'] },
  { email: 'mp-architect@cognitest.dev',  label: 'Creator',      roles: ['CR'] },
  { email: 'mp-curator@cognitest.dev',    label: 'Curator',       roles: ['CU'] },
  { email: 'mp-reviewer@cognitest.dev',   label: 'Reviewer',      roles: ['ER'] },
  { email: 'mp-finance@cognitest.dev',    label: 'Finance',       roles: ['FC'] },
  { email: 'mp-legal@cognitest.dev',      label: 'Legal',         roles: ['LC'] },
];

const AGG_QUICK_USERS: QuickUser[] = [
  { email: 'agg-solo@cognitest.dev',     label: 'Solo Founder',  roles: ['CR','CU','ER','LC','FC'] },
  { email: 'agg-creator@cognitest.dev',  label: 'Creator',       roles: ['CR'] },
  { email: 'agg-curator@cognitest.dev',  label: 'Curator',       roles: ['CU'] },
  { email: 'agg-reviewer@cognitest.dev', label: 'Reviewer',      roles: ['ER'] },
  { email: 'agg-finance@cognitest.dev',  label: 'Finance',       roles: ['FC'] },
  { email: 'agg-legal@cognitest.dev',    label: 'Legal',         roles: ['LC'] },
];

interface CogniLoginDevToolsProps {
  isSubmitting: boolean;
  onQuickLogin: (email: string) => void;
}

export function CogniLoginDevTools({ isSubmitting, onQuickLogin }: CogniLoginDevToolsProps) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMasterSeeding, setIsMasterSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState<string[] | null>(null);
  const [masterSeedLog, setMasterSeedLog] = useState<string[] | null>(null);
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedLog(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-cogni-test-data');
      if (error) { toast.error(`Seed failed: ${error.message}`); return; }
      if (data?.success) {
        setSeedLog(data.data.results);
        toast.success('CogniBlend test data seeded successfully!');
      } else {
        toast.error(data?.error?.message ?? 'Seeding failed');
      }
    } catch (err: unknown) {
      toast.error(`Seed error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleMasterSeed = async () => {
    setIsMasterSeeding(true);
    setMasterSeedLog(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-cogni-master');
      if (error) { toast.error(`Master seed failed: ${error.message}`); return; }
      if (data?.success) {
        setMasterSeedLog(data.data.results);
        toast.success(`Master seed complete! ${data.data.userCount} users, ${data.data.challengeCount} challenges created.`);
      } else {
        toast.error(data?.error?.message ?? 'Master seeding failed');
      }
    } catch (err: unknown) {
      toast.error(`Seed error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsMasterSeeding(false);
    }
  };

  return (
    <div className="mt-8 border-t border-border pt-6">
      <p className="text-xs text-muted-foreground text-center mb-3">Developer Tools</p>

      {/* Master Seed */}
      <Button type="button" variant="outline" disabled={isMasterSeeding} onClick={handleMasterSeed} className="w-full text-sm mb-2">
        {isMasterSeeding ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Seeding master data...</>
        ) : (
          <><Database className="mr-2 h-4 w-4" />Seed Master Test Data (MP + AGG)</>
        )}
      </Button>

      {masterSeedLog && (
        <div className="mt-2 mb-3 rounded-md bg-muted p-3 text-xs font-mono max-h-60 overflow-y-auto">
          {masterSeedLog.map((line, i) => <div key={i} className="whitespace-pre-wrap">{line}</div>)}
        </div>
      )}

      {/* Legacy Seed */}
      <Button type="button" variant="outline" disabled={isSeeding} onClick={handleSeedData} className="w-full text-sm">
        {isSeeding ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Seeding legacy data...</>
        ) : (
          <><Database className="mr-2 h-4 w-4" />Seed Legacy Test Data</>
        )}
      </Button>

      {seedLog && (
        <div className="mt-2 rounded-md bg-muted p-3 text-xs font-mono max-h-60 overflow-y-auto">
          {seedLog.map((line, i) => <div key={i} className="whitespace-pre-wrap">{line}</div>)}
        </div>
      )}

      {/* Quick Login */}
      <Collapsible open={quickLoginOpen} onOpenChange={setQuickLoginOpen} className="mt-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-sm">
            Quick Login (Test Users)
            {quickLoginOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Tabs defaultValue="mp" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="mp" className="text-xs">🔵 MP Users</TabsTrigger>
              <TabsTrigger value="agg" className="text-xs">🟣 AGG Users</TabsTrigger>
            </TabsList>

            <TabsContent value="mp" className="space-y-1.5 mt-2">
              {MP_QUICK_USERS.map((u) => (
                <QuickLoginButton key={u.email} user={u} variant="mp" disabled={isSubmitting} onClick={() => onQuickLogin(u.email)} />
              ))}
            </TabsContent>

            <TabsContent value="agg" className="space-y-1.5 mt-2">
              {AGG_QUICK_USERS.map((u) => (
                <QuickLoginButton key={u.email} user={u} variant="agg" disabled={isSubmitting} onClick={() => onQuickLogin(u.email)} />
              ))}
            </TabsContent>
          </Tabs>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Password: <code className="bg-muted px-1 rounded">CogniTest2026!</code>
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function QuickLoginButton({
  user,
  variant,
  disabled,
  onClick,
}: {
  user: QuickUser;
  variant: 'mp' | 'agg';
  disabled: boolean;
  onClick: () => void;
}) {
  const borderColor = variant === 'mp' ? 'border-blue-300' : 'border-purple-300';
  const hoverBg = variant === 'mp' ? 'hover:bg-blue-50' : 'hover:bg-purple-50';
  const badgeBg = variant === 'mp' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left text-xs transition-colors disabled:opacity-50 ${borderColor} ${hoverBg}`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{user.label}</span>
        <span className="text-muted-foreground text-[10px]">{user.email}</span>
      </div>
      <div className="flex flex-wrap gap-1 max-w-[180px] justify-end">
        {user.roles.map((r) => (
          <span key={r} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${badgeBg}`}>{r}</span>
        ))}
      </div>
    </button>
  );
}
