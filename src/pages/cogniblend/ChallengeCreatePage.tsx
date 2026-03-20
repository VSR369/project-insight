/**
 * ChallengeCreatePage — Role-aware landing page for challenge creation.
 * Route: /cogni/challenges/create
 *
 * Shows role-appropriate track cards:
 * - Track 1 (CR/CA): AI-Assisted + Manual Editor
 * - Track 2 (AM/RQ): Solution Request
 * - RQ (AGG, no bypass): Both tracks
 */

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Settings2, FileText, ArrowRight, ArrowLeft,
  Building2, Info, ChevronLeft, Zap, Shield, Lock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { resolveGovernanceMode, GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';
import { ConversationalIntakeContent } from './ConversationalIntakePage';
import ChallengeWizardPage from './ChallengeWizardPage';
import type { ChallengeTemplate } from '@/lib/challengeTemplates';
import type { GeneratedSpec } from '@/hooks/mutations/useGenerateChallengeSpec';
import { Skeleton } from '@/components/ui/skeleton';

type ActiveView = 'landing' | 'ai' | 'editor';

/** Shared state shape passed between AI intake and Advanced Editor */
export interface SharedIntakeState {
  problemStatement: string;
  maturityLevel: string;
  selectedTemplate: ChallengeTemplate | null;
  generatedSpec: GeneratedSpec | null;
}

/* ── Track Card ── */
interface TrackCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'recommended' | 'mandatory' | 'optional';
  onClick: () => void;
  fullWidth?: boolean;
}

function TrackCard({ icon, title, description, badge, badgeVariant, onClick, fullWidth }: TrackCardProps) {
  const badgeColors = {
    recommended: 'bg-primary/10 text-primary border-primary/20',
    mandatory: 'bg-destructive/10 text-destructive border-destructive/20',
    optional: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative flex flex-col items-start gap-3 rounded-xl border border-border
        bg-card p-6 text-left transition-all hover:border-primary/40
        hover:shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.12)]
        active:scale-[0.98]
        ${fullWidth ? 'col-span-full' : ''}
      `}
    >
      {badge && (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeColors[badgeVariant ?? 'optional']}`}>
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-1 group-hover:gap-2 transition-all">
        Get started <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

/* ── Governance Footer ── */
function GovernanceFooter({ mode }: { mode: string }) {
  const govMode = resolveGovernanceMode(mode);
  const config = GOVERNANCE_MODE_CONFIG[govMode];
  const icons = { QUICK: Zap, STRUCTURED: Shield, CONTROLLED: Lock };
  const Icon = icons[govMode];

  const descriptions: Record<string, string> = {
    QUICK: 'After AI generation, you'll see a read-only spec review for 1-click confirmation.',
    STRUCTURED: 'After AI generation, you'll review each section with Accept/Edit controls.',
    CONTROLLED: 'After AI generation, you'll use a side-panel editor to manually apply or skip each AI suggestion.',
  };

  return (
    <div
      className="flex items-start gap-3 rounded-lg border px-4 py-3"
      style={{ borderColor: `${config.color}33`, backgroundColor: `${config.bg}80` }}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: config.color }} />
      <div className="text-xs" style={{ color: config.color }}>
        <span className="font-semibold">{config.label} mode:</span>{' '}
        {descriptions[govMode]}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ChallengeCreatePage() {
  // ═══════ Hooks — state ═══════
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sharedState, setSharedState] = useState<SharedIntakeState>({
    problemStatement: '',
    maturityLevel: '',
    selectedTemplate: null,
    generatedSpec: null,
  });

  // ═══════ Hooks — queries ═══════
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext, isLoading: modelLoading } = useOrgModelContext();
  const { activeRole } = useCogniRoleContext();

  // ═══════ Handlers ═══════
  const handleSpecGenerated = useCallback((spec: GeneratedSpec) => {
    setSharedState((prev) => ({ ...prev, generatedSpec: spec }));
  }, []);

  const handleIntakeStateChange = useCallback((partial: Partial<SharedIntakeState>) => {
    setSharedState((prev) => ({ ...prev, ...partial }));
  }, []);

  // ═══════ Derived ═══════
  const paramTab = searchParams.get('tab');
  const activeView: ActiveView = paramTab === 'editor' ? 'editor' : paramTab === 'ai' ? 'ai' : 'landing';

  const setView = useCallback((view: ActiveView) => {
    if (view === 'landing') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: view }, { replace: true });
    }
  }, [setSearchParams]);

  const switchToEditor = useCallback(() => setView('editor'), [setView]);
  const switchToAI = useCallback(() => setView('ai'), [setView]);
  const backToLanding = useCallback(() => setView('landing'), [setView]);

  // Role-based visibility
  const isCreatorRole = ['CR', 'CA'].includes(activeRole);
  const isAM = activeRole === 'AM';
  const isRQ = activeRole === 'RQ';
  const isAGGModel = orgContext?.operatingModel === 'AGG';
  const hasBypass = isAGGModel && orgContext?.phase1Bypass === true;

  const showCreationCards = useMemo(() => {
    if (isCreatorRole) return true;
    if (isRQ && hasBypass) return true;
    if (isRQ && isAGGModel) return true; // RQ sees both tracks
    return false;
  }, [isCreatorRole, isRQ, hasBypass, isAGGModel]);

  const showRequestCard = useMemo(() => {
    if (isAM) return true;
    if (isRQ && isAGGModel && !hasBypass) return true;
    return false;
  }, [isAM, isRQ, isAGGModel, hasBypass]);

  const requestLabel = isAM ? 'Mandatory' : 'Optional';
  const requestBadgeVariant = isAM ? 'mandatory' as const : 'optional' as const;

  // ═══════ Loading ═══════
  if (orgLoading || modelLoading) {
    return (
      <div className="space-y-6 px-6 pt-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  // ═══════ Hard guard: no org ═══════
  if (!currentOrg) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold text-foreground">Organization Not Found</h2>
          <p className="text-sm text-muted-foreground">
            Your account isn't linked to an organization yet. If you're using the demo, please seed
            the scenario first, then log in with a seeded role account.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline" size="sm">
              <Link to="/cogni/demo-login">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Go to Demo Login
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/cogni/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════ Inline views (AI / Editor) ═══════
  if (activeView === 'ai') {
    return (
      <div className="w-full">
        <div className="px-6 pt-2 pb-4 space-y-3">
          <Button variant="ghost" size="sm" onClick={backToLanding} className="gap-1.5 -ml-2 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <CreationContextBar />
        </div>
        <ConversationalIntakeContent
          onSwitchToEditor={switchToEditor}
          sharedState={sharedState}
          onStateChange={handleIntakeStateChange}
          onSpecGenerated={handleSpecGenerated}
        />
      </div>
    );
  }

  if (activeView === 'editor') {
    return (
      <div className="w-full">
        <div className="px-6 pt-2 pb-4 space-y-3">
          <Button variant="ghost" size="sm" onClick={backToLanding} className="gap-1.5 -ml-2 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <CreationContextBar />
        </div>
        <ChallengeWizardPage
          embedded
          onSwitchToSimple={switchToAI}
          initialFromIntake={sharedState}
        />
      </div>
    );
  }

  // ═══════ Landing View ═══════
  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      {/* Context Bar */}
      <CreationContextBar />

      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">New Challenge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you'd like to get started.
        </p>
      </div>

      {/* Bypass Banner */}
      {isRQ && hasBypass && (
        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            Phase 1 bypassed — create challenges directly without submitting a request first.
          </p>
        </div>
      )}

      {/* Track Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Track 1: Challenge Creation */}
        {showCreationCards && (
          <>
            <TrackCard
              icon={<Sparkles className="h-5 w-5" />}
              title="AI-Assisted"
              description="Describe your challenge and AI generates a full specification. Review and refine based on your governance mode."
              badge="Recommended"
              badgeVariant="recommended"
              onClick={() => setView('ai')}
            />
            <TrackCard
              icon={<Settings2 className="h-5 w-5" />}
              title="Manual Editor"
              description="Build your challenge step-by-step using the 8-step wizard. Full control over every field and configuration."
              onClick={() => setView('editor')}
            />
          </>
        )}

        {/* Track 2: Solution Request */}
        {showRequestCard && (
          <TrackCard
            icon={<FileText className="h-5 w-5" />}
            title="Solution Request"
            description="Describe your business need. A Challenge Architect will convert it into a full challenge specification."
            badge={requestLabel}
            badgeVariant={requestBadgeVariant}
            onClick={() => navigate('/cogni/submit-request')}
            fullWidth={!showCreationCards}
          />
        )}
      </div>

      {/* Governance Mode Explanation */}
      <GovernanceFooter mode={currentOrg.governanceProfile} />
    </div>
  );
}
