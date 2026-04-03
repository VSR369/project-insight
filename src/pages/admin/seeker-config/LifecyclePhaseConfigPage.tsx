/**
 * LifecyclePhaseConfigPage — Supervisor configures lifecycle phases per governance mode.
 * Route: /admin/seeker-config/lifecycle-phases
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import LifecyclePhaseTable from '@/components/admin/lifecycle/LifecyclePhaseTable';

const MODES = ['QUICK', 'STRUCTURED', 'CONTROLLED'] as const;

export default function LifecyclePhaseConfigPage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<string>('STRUCTURED');

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/seeker-config/governance-rules')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Governance
      </Button>

      <PageHeader
        title="Lifecycle Phase Configuration"
        description="Configure the 10-phase challenge lifecycle per governance mode. Changes apply to all new challenges."
      />

      <Tabs value={activeMode} onValueChange={setActiveMode}>
        <TabsList>
          {MODES.map((m) => (
            <TabsTrigger key={m} value={m}>{m}</TabsTrigger>
          ))}
        </TabsList>
        {MODES.map((m) => (
          <TabsContent key={m} value={m}>
            <LifecyclePhaseTable mode={m} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
