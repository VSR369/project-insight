/**
 * useCurationComplexityActions — Complexity re-review, accept-all, and warning navigation.
 * Extracted from useCurationAIActions for ≤200 line compliance.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';

interface UseCurationComplexityActionsOptions {
  challengeId: string | undefined;
  aiReviews: SectionReview[];
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  setAiSuggestedComplexity: (v: any) => void;
  setHighlightWarnings: (v: boolean) => void;
  saveSectionMutationRef: React.RefObject<any>;
}

export function useCurationComplexityActions({
  challengeId, aiReviews, setAiReviews,
  setAiSuggestedComplexity, setHighlightWarnings, saveSectionMutationRef,
}: UseCurationComplexityActionsOptions) {

  const handleComplexityReReview = useCallback(async (_sectionKey: string) => {
    if (!challengeId) return;
    const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
      body: { challenge_id: challengeId, section_key: 'complexity', role_context: 'curation' },
    });

    if (error) {
      let msg = error.message;
      try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
      throw new Error(msg);
    }
    if (!data?.success) {
      throw new Error(data?.error?.message ?? "Complexity review failed");
    }

    const sections = data.data?.sections as any[];
    const complexitySection = sections?.[0];
    if (!complexitySection) throw new Error("No complexity review returned");

    if (complexitySection.suggested_complexity) {
      setAiSuggestedComplexity({ ...complexitySection.suggested_complexity });
    }

    const complexityReview: SectionReview = {
      section_key: 'complexity',
      status: complexitySection.status ?? 'warning',
      comments: complexitySection.comments ?? [],
      addressed: false,
      reviewed_at: complexitySection.reviewed_at ?? new Date().toISOString(),
    };
    const normalized = normalizeSectionReview(complexityReview);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== 'complexity');
      return [...filtered, normalized];
    });
    const currentReviews = aiReviews.filter((r) => r.section_key !== 'complexity');
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: [...currentReviews, normalized] });
    const hasIssues = (complexitySection.comments ?? []).length > 0;
    toast.success(hasIssues ? "Re-review complete — see updated complexity assessment." : "Complexity looks good — no issues found.");
  }, [challengeId, aiReviews, setAiReviews, setAiSuggestedComplexity, saveSectionMutationRef]);


  const handleReviewWarnings = useCallback(() => {
    setHighlightWarnings(true);
    const firstWarning = aiReviews.find(
      (r) => (r.status === "warning" || r.status === "needs_revision") && !r.addressed
    );
    if (firstWarning) {
      const el = document.querySelector(`[data-section-key="${firstWarning.section_key}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightWarnings(false), 10000);
  }, [aiReviews, setHighlightWarnings]);

  return {
    handleComplexityReReview,
    handleReviewWarnings,
  };
}
