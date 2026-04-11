/**
 * CuratorGuideModal — First-visit onboarding instruction sheet.
 *
 * Auto-opens once per challenge (localStorage). Re-openable via header help button.
 * Contains: Review Flow, AI Coverage & Quality, Time Savings, Section Dependencies.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Search,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Clock,
  TrendingUp,
  Zap,
  ArrowRight,
  Info,
} from "lucide-react";

const GUIDE_KEY_PREFIX = "curator_guide_seen_";

interface CuratorGuideModalProps {
  challengeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function markSeen(challengeId: string) {
  try {
    localStorage.setItem(`${GUIDE_KEY_PREFIX}${challengeId}`, "1");
  } catch { /* storage full — safe to ignore */ }
}

export function hasSeenGuide(challengeId: string): boolean {
  try {
    return !!localStorage.getItem(`${GUIDE_KEY_PREFIX}${challengeId}`);
  } catch {
    return false;
  }
}

export function CuratorGuideModal({
  challengeId,
  open,
  onOpenChange,
}: CuratorGuideModalProps) {
  const handleGotIt = () => {
    markSeen(challengeId);
    onOpenChange(false);
  };

  const handleShowLater = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0"
        hideCloseButton
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="text-xl font-bold">
            How Curation Review Works
          </DialogTitle>
          <DialogDescription className="text-sm">
            A 3-step AI-assisted workflow that transforms raw challenge briefs
            into publication-ready packages — at principal-consultant quality.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <ReviewFlowSection />
          <AICoverageSection />
          <TimeSavingsSection />
          <DependencySection />
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleShowLater}>
            Show again later
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleGotIt}>
            Got it, start reviewing
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sub-sections ── */

function ReviewFlowSection() {
  const steps = [
    {
      num: 1,
      icon: Search,
      title: "Analyse Challenge",
      desc: "AI reviews every section across 6 waves — identifying gaps, inconsistencies, and missing elements.",
    },
    {
      num: 2,
      icon: BookOpen,
      title: "Review Context Sources",
      desc: "Open the Context Library to accept or reject discovered references before proceeding.",
    },
    {
      num: 3,
      icon: Sparkles,
      title: "Generate Suggestions",
      desc: "AI produces grounded, section-by-section improvement suggestions using accepted sources.",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">The Review Flow</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="rounded-lg border bg-card p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {s.num}
              </span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{s.title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AICoverageSection() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        AI Review — Principal Consultant Grade
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* What AI covers */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            What AI Reviews Cover
          </h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <CoverageItem text="Section completeness & content quality" />
            <CoverageItem text="Cross-section consistency checks" />
            <CoverageItem text="Industry benchmarking & best practices" />
            <CoverageItem text="Risk & compliance surface scanning" />
            <CoverageItem text="Reward structure & budget alignment" />
          </ul>
        </div>

        {/* Quality justification */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Why Principal Consultant Level
          </h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <CoverageItem text="Simultaneous review of 20+ interdependent sections" />
            <CoverageItem text="Governance-aware: adapts to QUICK, STANDARD, or STRUCTURED modes" />
            <CoverageItem text="Pattern recognition across hundreds of challenge archetypes" />
            <CoverageItem text="Proactive risk surfacing — not just reactive checks" />
            <CoverageItem text="Structured, auditable output with traceability to sources" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function CoverageItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}

function TimeSavingsSection() {
  const metrics = [
    { icon: Zap, value: "~3 min", label: "Full AI review" },
    { icon: Clock, value: "3–4 hrs", label: "Equivalent manual effort" },
    { icon: TrendingUp, value: "~95%", label: "Time reduction" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Time You Get Back
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border bg-card p-4 text-center space-y-1"
          >
            <m.icon className="h-5 w-5 mx-auto text-primary" />
            <p className="text-lg font-bold text-foreground">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DependencySection() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-800/40 p-4 flex items-start gap-3">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
          Section dependencies matter
        </p>
        <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
          Complete <strong>Core Identity</strong> sections first — Problem
          Statement, Scope, and Expected Outcomes feed into downstream sections
          like Deliverables, Complexity, and Reward Structure. Skipping
          upstream sections weakens AI analysis quality for dependent areas.
        </p>
      </div>
    </div>
  );
}
