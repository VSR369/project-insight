/**
 * ChallengeCreatePage — Unified challenge creation with seamless AI ↔ Advanced Editor toggle.
 * Route: /cogni/challenges/create
 *
 * Default tab is "Create with AI" (conversational intake).
 * Users can toggle to "Advanced Editor" (8-step wizard) without navigating away.
 * URL param ?tab=editor allows deep-linking to the Advanced Editor tab.
 *
 * SHARED STATE: problemStatement, maturityLevel, selectedTemplate, and generatedSpec
 * are lifted here and passed down so data flows seamlessly between both views.
 */

import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Settings2, Info } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { ConversationalIntakeContent } from './ConversationalIntakePage';
import ChallengeWizardPage from './ChallengeWizardPage';
import type { ChallengeTemplate } from '@/lib/challengeTemplates';
import type { GeneratedSpec } from '@/hooks/mutations/useGenerateChallengeSpec';

type TabValue = 'ai' | 'editor';

/** Shared state shape passed between AI intake and Advanced Editor */
export interface SharedIntakeState {
  problemStatement: string;
  maturityLevel: string;
  selectedTemplate: ChallengeTemplate | null;
  generatedSpec: GeneratedSpec | null;
}

export default function ChallengeCreatePage() {
  // ═══════ Hooks — state ═══════
  const [searchParams, setSearchParams] = useSearchParams();

  // Shared state lifted from both children
  const [sharedState, setSharedState] = useState<SharedIntakeState>({
    problemStatement: '',
    maturityLevel: '',
    selectedTemplate: null,
    generatedSpec: null,
  });

  // ═══════ Hooks — queries ═══════
  const { data: currentOrg } = useCurrentOrg();

  // ═══════ Derived ═══════
  const activeTab: TabValue = searchParams.get('tab') === 'editor' ? 'editor' : 'ai';
  const hasAIDraft = !!sharedState.generatedSpec;

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

  /** Called by AI intake when spec is generated — auto-switch to editor */
  const handleSpecGenerated = useCallback((spec: GeneratedSpec) => {
    setSharedState((prev) => ({ ...prev, generatedSpec: spec }));
    // Auto-switch to editor so user can review/refine the AI draft
    switchToEditor();
  }, [switchToEditor]);

  /** Called by AI intake on field changes to keep shared state in sync */
  const handleIntakeStateChange = useCallback((partial: Partial<SharedIntakeState>) => {
    setSharedState((prev) => ({ ...prev, ...partial }));
  }, []);

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

      {/* Shared state indicator */}
      <div className="flex items-center gap-2 px-6 pb-3 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {hasAIDraft ? (
          <span className="text-primary font-medium">
            AI draft loaded — review and refine in the Advanced Editor.
          </span>
        ) : (
          <span>
            Your problem statement and template selections carry over between views.
          </span>
        )}
      </div>

      {/* AI Conversational Intake */}
      <TabsContent value="ai" className="mt-0">
        <ConversationalIntakeContent
          onSwitchToEditor={switchToEditor}
          sharedState={sharedState}
          onStateChange={handleIntakeStateChange}
          onSpecGenerated={handleSpecGenerated}
        />
      </TabsContent>

      {/* 8-step Challenge Wizard */}
      <TabsContent value="editor" className="mt-0">
        <ChallengeWizardPage
          embedded
          onSwitchToSimple={switchToAI}
          initialFromIntake={sharedState}
        />
      </TabsContent>
    </Tabs>
  );
}
