/**
 * RoleConvergencePage — Admin page for managing role conflict rules per governance mode.
 * Route: /admin/seeker-config/role-convergence
 */

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleConvergenceMatrix } from '@/components/admin/governance/RoleConvergenceMatrix';
import type { GovernanceMode } from '@/lib/governanceMode';

const MODES: GovernanceMode[] = ['QUICK', 'STRUCTURED', 'CONTROLLED'];

export default function RoleConvergencePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<GovernanceMode>('STRUCTURED');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/seeker-config/governance-rules')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Role Convergence Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Define which roles can be held by the same person per governance mode.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GovernanceMode)}>
        <TabsList>
          {MODES.map((mode) => (
            <TabsTrigger key={mode} value={mode}>{mode}</TabsTrigger>
          ))}
        </TabsList>
        {MODES.map((mode) => (
          <TabsContent key={mode} value={mode}>
            <RoleConvergenceMatrix governanceMode={mode} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
