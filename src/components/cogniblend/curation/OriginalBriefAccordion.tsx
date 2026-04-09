/**
 * OriginalBriefAccordion — Read-only accordion showing the original brief
 * submitted by the Challenge Creator.
 *
 * Extracted from CurationHeaderBar.tsx.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, AlertTriangle } from "lucide-react";
import { CHALLENGE_TEMPLATES } from "@/lib/challengeTemplates";
import { parseJson, resolveIndustrySegmentId } from "@/lib/cogniblend/curationHelpers";

export interface OriginalBriefAccordionProps {
  operatingModel: string | null;
  extendedBrief: unknown;
  rewardStructure: unknown;
  phaseSchedule: unknown;
  problemStatement: string;
  challenge: Record<string, unknown>;
  optimisticIndustrySegId: string | null;
  industrySegments: Array<{ id: string; name: string }> | undefined;
}

export function OriginalBriefAccordion({
  operatingModel,
  extendedBrief,
  rewardStructure,
  phaseSchedule,
  problemStatement,
  challenge,
  optimisticIndustrySegId,
  industrySegments,
}: OriginalBriefAccordionProps) {
  const extBrief = parseJson<any>(extendedBrief as any);
  const templateId = extBrief?.challenge_template_id;
  const template = templateId ? CHALLENGE_TEMPLATES.find((t) => t.id === templateId) : null;

  const segmentId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge as any);
  const segmentName = industrySegments?.find((s) => s.id === segmentId)?.name;

  const reward = parseJson<any>(rewardStructure as any);
  const sched = parseJson<any>(phaseSchedule as any);

  const solExpectations = extBrief?.solution_expectations;
  const beneficiaries = extBrief?.beneficiaries_mapping;
  const amApproval = extBrief?.am_approval_required;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="original-brief" className="border border-border rounded-lg">
        <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline gap-2">
          <div className="flex items-center gap-2 flex-1 text-left">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Creator's Original Brief</span>
            <Badge variant="outline" className="text-[10px] ml-auto">Read Only</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Challenge Template</p>
            {template ? (
              <Badge variant="secondary" className="mt-1 text-xs">
                <span className="mr-1">{template.emoji}</span>{template.name}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-0.5">No template selected</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Industry Segment</p>
            {segmentName ? (
              <Badge variant="outline" className="mt-1 text-xs">{segmentName}</Badge>
            ) : (
              <p className="text-sm text-destructive/80 italic mt-0.5">Not set — required in Context &amp; Background</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Problem Statement</p>
            <p className="text-sm text-foreground mt-0.5">{problemStatement || "—"}</p>
          </div>

          {reward && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Budget Range</p>
              <p className="text-sm text-foreground mt-0.5">
                {reward.currency ?? "USD"} {(reward.budget_min ?? 0).toLocaleString()} – {(reward.budget_max ?? 0).toLocaleString()}
              </p>
            </div>
          )}

          {sched?.expected_timeline && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Timeline Urgency</p>
              <p className="text-sm text-foreground mt-0.5">{sched.expected_timeline} months</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">Solution Expectations</p>
            {solExpectations && String(solExpectations).trim() ? (
              <p className="text-sm text-foreground mt-0.5">{String(solExpectations)}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-0.5">No content added</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Beneficiaries Mapping</p>
            {beneficiaries && String(beneficiaries).trim() ? (
              <p className="text-sm text-foreground mt-0.5">{String(beneficiaries)}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-0.5">No content added</p>
            )}
          </div>

          {operatingModel === "MP" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">CR Approval Required</p>
              {amApproval ? (
                <Badge className="mt-1 text-[10px] bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                  <AlertTriangle className="h-3 w-3 mr-1" />CR Gate Active
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-0.5">No — direct to curation</p>
              )}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
