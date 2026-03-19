/**
 * ChallengeCreatePage — Unified challenge creation with seamless AI ↔ Advanced Editor toggle.
 * Route: /cogni/challenges/create
 *
 * Default tab is "Create with AI" (conversational intake).
 * Users can toggle to "Advanced Editor" (8-step wizard) without navigating away.
 * URL param ?tab=editor allows deep-linking to the Advanced Editor tab.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Settings2 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { ConversationalIntakeContent } from './ConversationalIntakePage';
import ChallengeWizardPage from './ChallengeWizardPage';

type TabValue = 'ai' | 'editor';

export default function ChallengeCreatePage() {
  // ═══════ Hooks — state ═══════
  const [searchParams, setSearchParams] = useSearchParams();

  // ═══════ Hooks — queries ═══════
  const { data: currentOrg } = useCurrentOrg();

  // ═══════ Derived ═══════
  const activeTab: TabValue = searchParams.get('tab') === 'editor' ? 'editor' : 'ai';

  // ═══════ Handlers ═══════
  const handleTabChange = useCallback((value: string) => {
    const next = value as TabValue;
    if (next === 'editor') {
      setSearchParams({ tab: 'editor' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const switchToEditor = useCallback(() => handleTabChange('editor'), [handleTabChange]);
  const switchToAI = useCallback(() => handleTabChange('ai'), [handleTabChange]);

  // ═══════ Render ═══════
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {/* Tab toggle header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 pt-2 pb-4">
        <TabsList className="self-start">
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Create with AI
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            Advanced Editor
          </TabsTrigger>
        </TabsList>
        <GovernanceProfileBadge profile={currentOrg?.governanceProfile} compact />
      </div>

      {/* AI Conversational Intake */}
      <TabsContent value="ai" className="mt-0">
        <ConversationalIntakeContent onSwitchToEditor={switchToEditor} />
      </TabsContent>

      {/* 8-step Challenge Wizard */}
      <TabsContent value="editor" className="mt-0">
        <ChallengeWizardPage embedded onSwitchToSimple={switchToAI} />
      </TabsContent>
    </Tabs>
  );
}
