/**
 * Legal Document Attachment Page — /cogni/challenges/:id/legal
 *
 * Two-column layout showing Tier 1 (entry-phase) and Tier 2 (solution-phase)
 * legal document templates. Governance-aware: Lightweight auto-attaches defaults;
 * Enterprise requires manual attachment before proceeding.
 *
 * Features:
 *  - Preview modal for attached docs (PDF embed / text display)
 *  - Remove custom upload → revert to default
 *  - Audit trail logging via log_audit RPC
 *  - GATE-02 validation on submit → complete_phase (Phase 2 → 3)
 */

import { resolveGovernanceMode, isQuickMode } from '@/lib/governanceMode';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompletePhase } from "@/hooks/cogniblend/useCompletePhase";
import { useUserChallengeRoles } from "@/hooks/cogniblend/useUserChallengeRoles";
import { useLcReviewStatus } from "@/hooks/cogniblend/useLcReviewStatus";
import { useLegalReviewRequest } from "@/hooks/cogniblend/useLegalReviewRequest";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Info,
  AlertCircle,
  Send,
  X,
  Eye,
  Trash2,
  History,
  Scale,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { LegalVersionHistory } from "@/components/cogniblend/LegalVersionHistory";

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
  version_history: VersionEntry[];
  lc_status?: string | null;
}

interface VersionEntry {
  version: number;
  modified_by: string;
  modified_at: string;
  change_type: string;
}

type AttachmentStatus = "required" | "default_applied" | "custom_uploaded";

interface GateResult {
  passed: boolean;
  failures: string[];
}

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
// Helper: log to audit_trail via RPC
// ---------------------------------------------------------------------------
async function logLegalAudit(
  userId: string,
  challengeId: string,
  action: string,
  details: Record<string, unknown>
) {
  await supabase.rpc("log_audit", {
    p_user_id: userId,
    p_challenge_id: challengeId,
    p_solution_id: "",
    p_action: action,
    p_method: "UI",
    p_details: details as Json,
  });
}

// ---------------------------------------------------------------------------
// Helper: build updated version_history array
// ---------------------------------------------------------------------------
function buildVersionHistory(
  existing: VersionEntry[],
  userId: string,
  changeType: string
): VersionEntry[] {
  const nextVersion = (existing?.length ?? 0) + 1;
  return [
    ...(existing ?? []),
    {
      version: nextVersion,
      modified_by: userId,
      modified_at: new Date().toISOString(),
      change_type: changeType,
    },
  ];
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
  const { user } = useAuth();
  const completePhase = useCompletePhase();
  const pageTopRef = useRef<HTMLDivElement>(null);
  const { data: userRoles = [] } = useUserChallengeRoles(user?.id, challengeId);
  const { data: lcStatus } = useLcReviewStatus(challengeId);
  const legalReviewRequest = useLegalReviewRequest();
  const userHasLcRole = userRoles.includes('LC');

  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [gateFailures, setGateFailures] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    url: string;
    isPdf: boolean;
  } | null>(null);

  // Remove confirmation state
  const [removeTarget, setRemoveTarget] = useState<LegalTemplate | null>(null);

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
          "id, title, maturity_level, governance_profile, organization_id, phase_status, lc_review_required"
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
        .select("id, document_type, document_name, tier, status, version_history, lc_status")
        .eq("challenge_id", challengeId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((d: any) => ({
        ...d,
        version_history: Array.isArray(d.version_history) ? d.version_history : [],
        lc_status: d.lc_status ?? null,
      })) as AttachedDoc[];
    },
    enabled: !!challengeId,
  });

  // ══════════════════════════════════════
  // SECTION 5: Mutations
  // ══════════════════════════════════════
  const attachDefaultMutation = useMutation({
    mutationFn: async (template: LegalTemplate) => {
      const existing = attachedDocs.find(
        (d) =>
          d.document_type === template.document_type &&
          d.tier === template.tier
      );
      const isReplace = !!existing;

      const newHistory = buildVersionHistory(
        existing?.version_history ?? [],
        user?.id ?? 'system',
        isReplace ? 'replaced' : 'default_applied'
      );

      const { error } = await supabase.from("challenge_legal_docs").upsert(
        {
          challenge_id: challengeId!,
          document_type: template.document_type,
          document_name: template.document_name,
          tier: template.tier,
          status: "default_applied",
          maturity_level: challenge?.maturity_level ?? null,
          version_history: newHistory as any,
        },
        { onConflict: "challenge_id,document_type,tier" as any }
      );
      if (error) throw new Error(error.message);

      // Audit
      if (user?.id && challengeId) {
        await logLegalAudit(
          user.id,
          challengeId,
          isReplace ? "LEGAL_DOC_REPLACED" : "LEGAL_DOC_ATTACHED",
          {
            document_type: template.document_type,
            tier: template.tier,
            status: "default_applied",
            template_version: "v1.0",
          }
        );
      }
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
      const existing = attachedDocs.find(
        (d) =>
          d.document_type === template.document_type &&
          d.tier === template.tier
      );
      const isReplace = !!existing;

      // Upload to legal-docs storage bucket
      const path = `${challengeId}/${template.document_type}_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("legal-docs")
        .upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);

      // Upsert legal doc record with version history
      const uploadHistory = buildVersionHistory(
        existing?.version_history ?? [],
        user?.id ?? 'system',
        isReplace ? 'replaced' : 'custom_uploaded'
      );

      const { error } = await supabase.from("challenge_legal_docs").upsert(
        {
          challenge_id: challengeId!,
          document_type: template.document_type,
          document_name: file.name,
          tier: template.tier,
          status: "custom_uploaded",
          maturity_level: challenge?.maturity_level ?? null,
          version_history: uploadHistory as any,
        },
        { onConflict: "challenge_id,document_type,tier" as any }
      );
      if (error) throw new Error(error.message);

      // Audit
      if (user?.id && challengeId) {
        await logLegalAudit(
          user.id,
          challengeId,
          isReplace ? "LEGAL_DOC_REPLACED" : "LEGAL_DOC_ATTACHED",
          {
            document_type: template.document_type,
            tier: template.tier,
            status: "custom_uploaded",
            file_name: file.name,
            template_version: "custom",
          }
        );
      }
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

  const removeCustomMutation = useMutation({
    mutationFn: async (template: LegalTemplate) => {
      // Find the attached doc record
      const attached = attachedDocs.find(
        (d) =>
          d.document_type === template.document_type &&
          d.tier === template.tier &&
          d.status === "custom_uploaded"
      );
      if (!attached) throw new Error("No custom document found");

      // List and remove files from storage for this doc type
      const { data: files } = await supabase.storage
        .from("legal-docs")
        .list(challengeId!, {
          search: template.document_type,
        });
      if (files && files.length > 0) {
        const paths = files
          .filter((f) => f.name.startsWith(template.document_type))
          .map((f) => `${challengeId}/${f.name}`);
        if (paths.length > 0) {
          await supabase.storage.from("legal-docs").remove(paths);
        }
      }

      // Revert to default: upsert with version history
      const revertHistory = buildVersionHistory(
        attached?.version_history ?? [],
        user?.id ?? 'system',
        'reverted_to_default'
      );

      const { error } = await supabase.from("challenge_legal_docs").upsert(
        {
          challenge_id: challengeId!,
          document_type: template.document_type,
          document_name: template.document_name,
          tier: template.tier,
          status: "default_applied",
          maturity_level: challenge?.maturity_level ?? null,
          version_history: revertHistory as any,
        },
        { onConflict: "challenge_id,document_type,tier" as any }
      );
      if (error) throw new Error(error.message);

      // Audit
      if (user?.id && challengeId) {
        await logLegalAudit(user.id, challengeId, "LEGAL_DOC_REPLACED", {
          document_type: template.document_type,
          tier: template.tier,
          status: "reverted_to_default",
          template_version: "v1.0",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["challenge-legal-docs", challengeId],
      });
      setRemoveTarget(null);
      toast.success("Custom document removed. Default applied.");
    },
    onError: (err: Error) => {
      setRemoveTarget(null);
      toast.error(`Remove failed: ${err.message}`);
    },
  });

  // ══════════════════════════════════════
  // SECTION 6: Auto-attach defaults for Quick mode
  // ══════════════════════════════════════
  const isLightweight = isQuickMode(resolveGovernanceMode(challenge?.governance_profile));

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

  const handlePreview = async (template: LegalTemplate) => {
    const attached = attachedDocs.find(
      (d) =>
        d.document_type === template.document_type && d.tier === template.tier
    );
    if (!attached) return;

    if (attached.status === "default_applied") {
      // Default templates — show informational preview
      setPreviewDoc({
        name: template.document_name,
        url: "",
        isPdf: false,
      });
      return;
    }

    // Custom uploaded — get signed URL from storage
    const { data: files } = await supabase.storage
      .from("legal-docs")
      .list(challengeId!, { search: template.document_type });

    const matchedFile = files?.find((f) =>
      f.name.startsWith(template.document_type)
    );
    if (!matchedFile) {
      toast.error("File not found in storage");
      return;
    }

    const { data: urlData } = await supabase.storage
      .from("legal-docs")
      .createSignedUrl(`${challengeId}/${matchedFile.name}`, 3600);

    if (urlData?.signedUrl) {
      const isPdf =
        matchedFile.name.toLowerCase().endsWith(".pdf") ||
        (attached.document_name ?? "").toLowerCase().endsWith(".pdf");
      setPreviewDoc({
        name: attached.document_name ?? template.document_name,
        url: urlData.signedUrl,
        isPdf,
      });
    } else {
      toast.error("Could not generate preview URL");
    }
  };

  const handleSubmitForCuration = async () => {
    setIsValidating(true);
    setGateFailures([]);

    try {
      const { data, error } = await supabase.rpc("validate_gate_02", {
        p_challenge_id: challengeId!,
      });
      if (error) throw new Error(error.message);

      const result = (
        typeof data === "string" ? JSON.parse(data) : data
      ) as GateResult;

      if (!result.passed) {
        setGateFailures(result.failures ?? ["Validation failed"]);
        pageTopRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setShowConfirmModal(true);
      }
    } catch (err: any) {
      toast.error(`Validation error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!user?.id || !challengeId) return;
    setShowConfirmModal(false);

    try {
      // If coming from LEGAL_VERIFICATION_PENDING, transition to COMPLETED first and log audit
      if (challenge?.phase_status === 'LEGAL_VERIFICATION_PENDING') {
        await supabase
          .from('challenges')
          .update({ phase_status: 'COMPLETED' })
          .eq('id', challengeId);

        await logLegalAudit(user.id, challengeId, 'LEGAL_VERIFICATION_COMPLETE', {
          previous_phase_status: 'LEGAL_VERIFICATION_PENDING',
          new_phase_status: 'COMPLETED',
          governance_profile: challenge?.governance_profile,
        });
      }

      // Now advance to Phase 3 via complete_phase
      completePhase.mutate(
        { challengeId, userId: user.id },
        {
          onSuccess: () => {
            toast.success("Challenge submitted for curation.");
            navigate("/cogni/dashboard");
          },
        }
      );
    } catch (err: any) {
      toast.error(`Submission error: ${err.message}`);
    }
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
          <Badge
            variant="outline"
            className="text-xs border-primary text-primary"
          >
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
    const attached = attachedDocs.find(
      (d) => d.document_type === template.document_type && d.tier === template.tier
    );
    const isUploading = uploadingDocType === template.document_type;
    const isCustom = status === "custom_uploaded";
    const isAttached = status !== "required";

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
              {showPhaseTrigger &&
                TIER2_PHASE_TRIGGER[template.document_type] && (
                  <p className="text-[11px] text-muted-foreground italic mt-1">
                    Triggered at:{" "}
                    {TIER2_PHASE_TRIGGER[template.document_type]}
                  </p>
                )}
            </div>
            {statusBadge(status)}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Preview button — visible when attached */}
            {isAttached && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handlePreview(template)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
            )}

            {/* Remove button — visible only for custom uploads */}
            {isCustom && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setRemoveTarget(template)}
                disabled={removeCustomMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            )}
          </div>

          {/* Version History */}
          {attached && attached.version_history.length > 0 && (
            <LegalVersionHistory history={attached.version_history} />
          )}
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
    <div ref={pageTopRef} className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <WorkflowProgressBanner step={3} />
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Legal Document Attachment
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{challenge.title}</p>
      </div>

      {/* GATE-02 validation failures banner */}
      {gateFailures.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm font-semibold text-destructive">
                Validation failed — please resolve the following:
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setGateFailures([])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-7">
            {gateFailures.map((f, i) => (
              <li key={i} className="text-sm text-destructive/90">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LEGAL_VERIFICATION_PENDING amber banner (Enterprise only) */}
      {challenge?.phase_status === 'LEGAL_VERIFICATION_PENDING' && (
        <div className="flex items-start gap-3 rounded-lg border border-[hsl(38,80%,60%)]/40 bg-[hsl(38,80%,60%)]/10 p-4">
          <AlertCircle className="h-5 w-5 text-[hsl(38,68%,41%)] shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            This challenge requires legal document attachment before it can be submitted for curation.
          </p>
        </div>
      )}

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

      {/* LC Review Required banner */}
      {(challenge as any)?.lc_review_required && !userHasLcRole && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-50 p-4">
          <Scale className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Legal Coordinator review is required
            </p>
            <p className="text-xs text-muted-foreground">
              Your organization requires Legal Coordinator approval for all legal documents before this challenge can proceed to curation.
            </p>
            {!lcStatus?.hasPending && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  if (challengeId) {
                    legalReviewRequest.mutate({
                      challengeId,
                      documentId: null,
                      lcUserId: null,
                      isMandatory: true,
                    });
                  }
                }}
                disabled={legalReviewRequest.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {legalReviewRequest.isPending ? 'Sending…' : 'Send All Docs to Legal Coordinator'}
              </Button>
            )}
            {lcStatus?.hasPending && (
              <Badge variant="outline" className="mt-2 border-amber-300 bg-amber-100 text-amber-700 text-xs">
                Awaiting LC review
              </Badge>
            )}
          </div>
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
      </div>

      {/* Submit for Curation — LC only; CR/others see handoff CTA */}
      {userHasLcRole ? (
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleSubmitForCuration}
          disabled={
            isValidating ||
            completePhase.isPending ||
            (lcStatus?.hasPending ?? false) ||
            (lcStatus?.hasRejected ?? false)
          }
        >
          <Send className="h-4 w-4" />
          {isValidating
            ? "Validating…"
            : completePhase.isPending
            ? "Submitting…"
            : lcStatus?.hasPending
            ? "Awaiting LC Review…"
            : lcStatus?.hasRejected
            ? "LC Rejected — Revise Documents"
            : "Submit for Curation"}
        </Button>
      ) : (
        <div className="rounded-lg border border-muted bg-muted/30 p-4 space-y-3">
          {lcStatus?.hasPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Documents sent to Legal Coordinator — awaiting review</span>
            </div>
          ) : lcStatus?.allApproved && (lcStatus?.docs?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>All documents approved by Legal Coordinator</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                The Legal Coordinator must review these documents before the challenge can proceed to curation.
              </p>
              <Button
                className="w-full gap-2"
                size="lg"
                variant="outline"
                onClick={() => {
                  if (challengeId) {
                    legalReviewRequest.mutate({
                      challengeId,
                      documentId: null,
                      lcUserId: null,
                      isMandatory: false,
                    });
                  }
                }}
                disabled={legalReviewRequest.isPending}
              >
                <Send className="h-4 w-4" />
                {legalReviewRequest.isPending ? 'Sending…' : 'Send to Legal Coordinator for Review'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Confirmation modal — submit for curation */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Submit for Curation Review</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Submit this challenge for curation review? The Curator will check
            completeness and consistency before the challenge proceeds to
            publication.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={completePhase.isPending}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              {completePhase.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      <Dialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
      >
        <DialogContent className="w-full max-w-[640px] max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base">
              {previewDoc?.name ?? "Document Preview"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {previewDoc?.url ? (
              previewDoc.isPdf ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[60vh] rounded border border-border"
                  title="PDF Preview"
                />
              ) : (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This document type cannot be rendered inline. Use the link
                    below to download and view.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Document
                    </a>
                  </Button>
                </div>
              )
            ) : (
              <div className="p-4 space-y-2">
                <p className="text-sm text-foreground font-medium">
                  System Default Template
                </p>
                <p className="text-sm text-muted-foreground">
                  This document uses the platform&apos;s default legal template.
                  The standard template is maintained by the platform
                  governance team and is automatically kept up to date.
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Template version: v1.0
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove custom document confirmation modal */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Remove Custom Document
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove the custom document for{" "}
            <span className="font-medium text-foreground">
              {removeTarget?.document_name}
            </span>
            ? The system default will be applied instead.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removeTarget) removeCustomMutation.mutate(removeTarget);
              }}
              disabled={removeCustomMutation.isPending}
            >
              {removeCustomMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
