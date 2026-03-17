/**
 * Legal Document Attachment Page — /cogni/challenges/:id/legal
 *
 * Two-column layout showing Tier 1 (entry-phase) and Tier 2 (solution-phase)
 * legal document templates. Governance-aware: Lightweight auto-attaches defaults;
 * Enterprise requires manual attachment before proceeding.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Upload,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Info,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LegalTemplate {
  template_id: string;
  document_type: string;
  document_name: string;
  tier: string;
  description: string;
}

interface AttachedDoc {
  id: string;
  document_type: string;
  document_name: string | null;
  tier: string;
  status: string | null;
}

type AttachmentStatus = "required" | "default_applied" | "custom_uploaded";

// Phase trigger mapping for Tier 2 documents
const TIER2_PHASE_TRIGGER: Record<string, string> = {
  solution_eval_consent: "Phase 10 — Evaluation",
  ai_usage_policy: "Phase 8 — Screening",
  dispute_resolution: "Phase 13 — Closure",
  withdrawal: "Phase 3 — Curation",
  escrow: "Phase 9 — Payment",
  rejection_fee: "Phase 12 — Payment",
  blind_ip_access: "Phase 10 — Evaluation",
  ip_transfer: "Phase 11 — Selection",
  ai_similarity_watch: "Phase 10 — Evaluation",
};

// ---------------------------------------------------------------------------
// Helper: determine attachment status for a template
// ---------------------------------------------------------------------------
function getDocStatus(
  template: LegalTemplate,
  attachedDocs: AttachedDoc[]
): AttachmentStatus {
  const match = attachedDocs.find(
    (d) => d.document_type === template.document_type && d.tier === template.tier
  );
  if (!match) return "required";
  if (match.status === "custom_uploaded") return "custom_uploaded";
  return "default_applied";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LegalDocumentAttachmentPage() {
  // ══════════════════════════════════════
  // SECTION 1: State
  // ══════════════════════════════════════
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // ══════════════════════════════════════
  // SECTION 2: Query — challenge metadata
  // ══════════════════════════════════════
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ["challenge-legal", challengeId],
    queryFn: async () => {
      if (!challengeId) throw new Error("Missing challenge ID");
      const { data, error } = await supabase
        .from("challenges")
        .select(
          "id, title, maturity_level, governance_profile, organization_id"
        )
        .eq("id", challengeId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
  });

  // ══════════════════════════════════════
  // SECTION 3: Query — required templates via RPC
  // ══════════════════════════════════════
  const { data: requiredDocs, isLoading: docsLoading } = useQuery({
    queryKey: [
      "required-legal-docs",
      challenge?.maturity_level,
      challenge?.governance_profile,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_required_legal_docs", {
        p_maturity_level: challenge!.maturity_level!,
        p_governance_profile: challenge!.governance_profile ?? "Enterprise",
      });
      if (error) throw new Error(error.message);
      return data as unknown as {
        tier_1: LegalTemplate[];
        tier_2: LegalTemplate[];
      };
    },
    enabled: !!challenge?.maturity_level,
    staleTime: 5 * 60 * 1000,
  });

  // ══════════════════════════════════════
  // SECTION 4: Query — already-attached docs
  // ══════════════════════════════════════
  const { data: attachedDocs = [], isLoading: attachedLoading } = useQuery({
    queryKey: ["challenge-legal-docs", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_legal_docs")
        .select("id, document_type, document_name, tier, status")
        .eq("challenge_id", challengeId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as AttachedDoc[];
    },
    enabled: !!challengeId,
  });

  // ══════════════════════════════════════
  // SECTION 5: Mutations
  // ══════════════════════════════════════
  const attachDefaultMutation = useMutation({
    mutationFn: async (template: LegalTemplate) => {
      const { error } = await supabase.from("challenge_legal_docs").upsert(
        {
          challenge_id: challengeId!,
          document_type: template.document_type,
          document_name: template.document_name,
          tier: template.tier,
          status: "default_applied",
          maturity_level: challenge?.maturity_level ?? null,
        },
        { onConflict: "challenge_id,document_type,tier" as any }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["challenge-legal-docs", challengeId],
      });
      toast.success("Default template applied");
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });

  const uploadCustomMutation = useMutation({
    mutationFn: async ({
      template,
      file,
    }: {
      template: LegalTemplate;
      file: File;
    }) => {
      // Upload to storage
      const path = `legal/${challengeId}/${template.document_type}_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);

      // Upsert legal doc record
      const { error } = await supabase.from("challenge_legal_docs").upsert(
        {
          challenge_id: challengeId!,
          document_type: template.document_type,
          document_name: file.name,
          tier: template.tier,
          status: "custom_uploaded",
          maturity_level: challenge?.maturity_level ?? null,
        },
        { onConflict: "challenge_id,document_type,tier" as any }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["challenge-legal-docs", challengeId],
      });
      setUploadingDocType(null);
      toast.success("Custom document uploaded");
    },
    onError: (err: Error) => {
      setUploadingDocType(null);
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  // ══════════════════════════════════════
  // SECTION 6: Auto-attach defaults for Lightweight
  // ══════════════════════════════════════
  const isLightweight =
    (challenge?.governance_profile ?? "").toLowerCase() === "lightweight";

  useEffect(() => {
    if (!isLightweight || !requiredDocs || attachedDocs.length > 0) return;

    const allTemplates = [
      ...(requiredDocs.tier_1 ?? []),
      ...(requiredDocs.tier_2 ?? []),
    ];
    if (allTemplates.length === 0) return;

    const rows = allTemplates.map((t) => ({
      challenge_id: challengeId!,
      document_type: t.document_type,
      document_name: t.document_name,
      tier: t.tier,
      status: "default_applied",
      maturity_level: challenge?.maturity_level ?? null,
    }));

    supabase
      .from("challenge_legal_docs")
      .insert(rows as any)
      .then(({ error }) => {
        if (!error) {
          queryClient.invalidateQueries({
            queryKey: ["challenge-legal-docs", challengeId],
          });
        }
      });
  }, [
    isLightweight,
    requiredDocs,
    attachedDocs.length,
    challengeId,
    challenge?.maturity_level,
    queryClient,
  ]);

  // ══════════════════════════════════════
  // SECTION 7: Computed summaries
  // ══════════════════════════════════════
  const tier1Templates = requiredDocs?.tier_1 ?? [];
  const tier2Templates = requiredDocs?.tier_2 ?? [];

  const tier1Attached = useMemo(
    () =>
      tier1Templates.filter((t) => getDocStatus(t, attachedDocs) !== "required")
        .length,
    [tier1Templates, attachedDocs]
  );
  const tier2Attached = useMemo(
    () =>
      tier2Templates.filter((t) => getDocStatus(t, attachedDocs) !== "required")
        .length,
    [tier2Templates, attachedDocs]
  );

  const allComplete =
    tier1Templates.length > 0 &&
    tier2Templates.length >= 0 &&
    tier1Attached === tier1Templates.length &&
    tier2Attached === tier2Templates.length;

  // ══════════════════════════════════════
  // SECTION 8: Conditional returns
  // ══════════════════════════════════════
  if (challengeLoading || docsLoading || attachedLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Challenge not found.
      </div>
    );
  }

  // ══════════════════════════════════════
  // SECTION 9: Handlers
  // ══════════════════════════════════════
  const handleUseDefault = (template: LegalTemplate) => {
    attachDefaultMutation.mutate(template);
  };

  const handleUploadCustom = (template: LegalTemplate) => {
    setUploadingDocType(template.document_type);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.doc";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadCustomMutation.mutate({ template, file });
      } else {
        setUploadingDocType(null);
      }
    };
    input.click();
  };

  const handleProceed = () => {
    toast.success("Legal documents attached. Proceeding to curation.");
    navigate("/cogni/dashboard");
  };

  // ══════════════════════════════════════
  // SECTION 10: Render helpers
  // ══════════════════════════════════════
  const statusBadge = (status: AttachmentStatus) => {
    switch (status) {
      case "required":
        return (
          <Badge variant="destructive" className="text-xs">
            Required
          </Badge>
        );
      case "default_applied":
        return (
          <Badge variant="secondary" className="text-xs">
            Default Applied
          </Badge>
        );
      case "custom_uploaded":
        return (
          <Badge variant="outline" className="text-xs border-primary text-primary">
            Custom Uploaded
          </Badge>
        );
    }
  };

  const renderDocCard = (
    template: LegalTemplate,
    showPhaseTrigger: boolean
  ) => {
    const status = getDocStatus(template, attachedDocs);
    const isUploading = uploadingDocType === template.document_type;

    return (
      <Card
        key={`${template.tier}-${template.document_type}`}
        className="border border-border/60"
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">
                {template.document_name}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
              {showPhaseTrigger && TIER2_PHASE_TRIGGER[template.document_type] && (
                <p className="text-[11px] text-muted-foreground italic mt-1">
                  Triggered at: {TIER2_PHASE_TRIGGER[template.document_type]}
                </p>
              )}
            </div>
            {statusBadge(status)}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => handleUseDefault(template)}
              disabled={
                attachDefaultMutation.isPending ||
                uploadCustomMutation.isPending
              }
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Use Default
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleUploadCustom(template)}
              disabled={isUploading || uploadCustomMutation.isPending}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              {isUploading ? "Uploading…" : "Upload Custom"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ══════════════════════════════════════
  // SECTION 11: Render
  // ══════════════════════════════════════
  const tier1Pct =
    tier1Templates.length > 0
      ? Math.round((tier1Attached / tier1Templates.length) * 100)
      : 100;
  const tier2Pct =
    tier2Templates.length > 0
      ? Math.round((tier2Attached / tier2Templates.length) * 100)
      : 100;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Legal Document Attachment
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {challenge.title}
        </p>
      </div>

      {/* Lightweight auto-attach banner */}
      {isLightweight && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            All legal documents have been auto-attached using default templates.
            You can replace any with custom documents if needed.
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Tier 1 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Tier 1: Entry-Phase Documents
            </h2>
          </div>
          {tier1Templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No Tier 1 documents required for this configuration.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tier1Templates.map((t) => renderDocCard(t, false))}
            </div>
          )}
        </div>

        {/* RIGHT — Tier 2 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Tier 2: Solution-Phase Templates
            </h2>
          </div>
          {tier2Templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No Tier 2 documents required for this configuration.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tier2Templates.map((t) => renderDocCard(t, true))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom progress summary */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Info className="h-4 w-4 text-muted-foreground" />
          Attachment Progress
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Tier 1: {tier1Attached} / {tier1Templates.length} attached
              </span>
              <span>{tier1Pct}%</span>
            </div>
            <Progress value={tier1Pct} className="h-2" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Tier 2: {tier2Attached} / {tier2Templates.length} attached
              </span>
              <span>{tier2Pct}%</span>
            </div>
            <Progress value={tier2Pct} className="h-2" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleProceed}
            disabled={!allComplete}
            className="gap-2"
          >
            Proceed to Curation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
