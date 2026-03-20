/**
 * DemoSeedCard — Seed button for the New Horizon Company demo scenario.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function DemoSeedCard() {
  const [seedStatus, setSeedStatus] = useState<'idle' | 'seeding' | 'done' | 'error'>('idle');
  const [seedLog, setSeedLog] = useState<string[]>([]);

  const handleSeedScenario = useCallback(async () => {
    setSeedStatus('seeding');
    setSeedLog(['⏳ Setting up New Horizon Company demo scenario...']);
    try {
      const { data, error } = await supabase.functions.invoke('setup-test-scenario', {
        body: { scenario: 'new_horizon_demo' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error?.message ?? 'Unknown error');
      setSeedLog(data.data.results);
      setSeedStatus('done');
      toast.success('Demo scenario seeded successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Seed failed';
      setSeedLog((prev) => [...prev, `❌ ${message}`]);
      setSeedStatus('error');
      toast.error(`Seed failed: ${message}`);
    }
  }, []);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Step 1: Seed Demo Data
        </CardTitle>
        <CardDescription>
          Creates the "New Horizon Company" org, 9 test users, and assigns challenge roles.
          Run this once — it's safe to re-run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleSeedScenario}
          disabled={seedStatus === 'seeding'}
          variant={seedStatus === 'done' ? 'secondary' : 'default'}
          className="w-full lg:w-auto"
        >
          {seedStatus === 'seeding' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {seedStatus === 'done' && <CheckCircle2 className="mr-2 h-4 w-4" />}
          {seedStatus === 'error' && <AlertCircle className="mr-2 h-4 w-4" />}
          {seedStatus === 'idle' && <Play className="mr-2 h-4 w-4" />}
          {seedStatus === 'seeding' ? 'Seeding...' : seedStatus === 'done' ? 'Seeded ✓ (Re-run)' : 'Seed Demo Scenario'}
        </Button>
        {seedLog.length > 0 && (
          <div className="mt-3 rounded-md bg-muted p-3 text-xs font-mono max-h-48 overflow-y-auto border">
            {seedLog.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap">{line}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
