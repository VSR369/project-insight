/**
 * Step 7 — Review & Submit
 * Dynamically shows ALL form values grouped by wizard step.
 */

import { UseFormReturn } from 'react-hook-form';
import { CheckCircle, AlertCircle, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

interface StepReviewSubmitProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isQuick: boolean;
  fieldRules?: Record<string, { visibility: string; minLength: number | null; maxLength: number | null; defaultValue: string | null }>;
  onNavigateToStep?: (step: number) => void;
}

function SummaryRow({ label, value, isValid }: { label: string; value: string; isValid: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border last:border-b-0">
      {isValid ? (
        <CheckCircle className="h-3.5 w-3.5 text-[hsl(155,68%,37%)] shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm break-words', isValid ? 'text-foreground' : 'text-destructive italic')}>
          {value || 'Not provided'}
        </p>
      </div>
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (Array.isArray(val)) {
    if (val.length === 0) return '';
    if (typeof val[0] === 'object') return `${val.length} items`;
    return val.join(', ');
  }
  if (typeof val === 'object') return JSON.stringify(val).substring(0, 100) + '…';
  return String(val);
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function StepReviewSubmit({ form, isQuick, onNavigateToStep }: StepReviewSubmitProps) {
  const v = form.getValues();

  const sections = [
    {
      title: 'Step 1: Challenge Brief',
      step: 1,
      fields: [
        { label: 'Title', value: v.title, isValid: !!v.title },
        { label: 'Industry Segment', value: v.industry_segment_id || '', isValid: true },
        { label: 'Experience Countries', value: v.experience_countries?.length ? `${v.experience_countries.length} selected` : '', isValid: true },
        { label: 'Context & Background', value: stripHtml(v.context_background ?? '') ? '✓ Provided' : '', isValid: true },
        { label: 'Problem Statement', value: stripHtml(v.problem_statement ?? '') ? `${stripHtml(v.problem_statement ?? '').length} characters` : '', isValid: !!stripHtml(v.problem_statement ?? '') },
        { label: 'Detailed Description', value: stripHtml(v.detailed_description ?? '') ? '✓ Provided' : '', isValid: true },
        { label: 'Root Causes', value: Array.isArray(v.root_causes) ? (v.root_causes.filter(Boolean).length ? `${v.root_causes.filter(Boolean).length} items` : '') : '', isValid: true },
        { label: 'Scope', value: stripHtml(v.scope ?? '') ? '✓ Provided' : '', isValid: true },
        { label: 'Deliverables', value: v.deliverables_list?.filter(Boolean).length ? `${v.deliverables_list.filter(Boolean).length} items` : '', isValid: (v.deliverables_list?.filter(Boolean).length ?? 0) > 0 },
        { label: 'Affected Stakeholders', value: Array.isArray(v.affected_stakeholders) ? (v.affected_stakeholders.length ? `${v.affected_stakeholders.length} stakeholders` : '') : '', isValid: true },
        { label: 'Current Deficiencies', value: Array.isArray(v.current_deficiencies) ? (v.current_deficiencies.filter(Boolean).length ? `${v.current_deficiencies.filter(Boolean).length} items` : '') : '', isValid: true },
        { label: 'Expected Outcomes', value: Array.isArray(v.expected_outcomes) ? (v.expected_outcomes.filter(Boolean).length ? `${v.expected_outcomes.filter(Boolean).length} items` : '') : '', isValid: true },
        { label: 'Preferred Approach', value: Array.isArray(v.preferred_approach) ? (v.preferred_approach.filter(Boolean).length ? `${v.preferred_approach.filter(Boolean).length} items` : '') : '', isValid: true },
        { label: 'Approaches NOT of Interest', value: Array.isArray(v.approaches_not_of_interest) ? (v.approaches_not_of_interest.filter(Boolean).length ? `${v.approaches_not_of_interest.filter(Boolean).length} items` : '') : '', isValid: true },
        { label: 'Submission Guidelines', value: Array.isArray(v.submission_guidelines) ? (v.submission_guidelines.filter(Boolean).length ? `${v.submission_guidelines.filter(Boolean).length} items` : '') : '', isValid: true },
        { label: 'Domain Tags', value: v.domain_tags?.join(', ') ?? '', isValid: (v.domain_tags?.length ?? 0) > 0 },
        { label: 'Maturity Level', value: v.maturity_level ?? '', isValid: !!v.maturity_level },
      ],
    },
    {
      title: 'Step 2: Evaluation Criteria',
      step: 2,
      fields: [
        { label: 'Criteria Count', value: `${v.weighted_criteria?.length ?? 0} criteria`, isValid: (v.weighted_criteria?.length ?? 0) > 0 },
        { label: 'Total Weight', value: `${v.weighted_criteria?.reduce((s, c) => s + c.weight, 0) ?? 0}%`, isValid: (v.weighted_criteria?.reduce((s, c) => s + c.weight, 0) ?? 0) === 100 },
        ...(v.weighted_criteria ?? []).map((c, i) => ({
          label: `Criterion ${i + 1}: ${c.name || 'Unnamed'}`,
          value: `Weight: ${c.weight}%${c.description ? ` — ${c.description}` : ''}`,
          isValid: !!c.name && c.weight > 0,
        })),
      ],
    },
    {
      title: 'Step 3: Rewards & Payment',
      step: 3,
      fields: [
        { label: 'Reward Type', value: v.reward_type ?? 'monetary', isValid: true },
        { label: 'Currency', value: v.currency_code, isValid: !!v.currency_code },
        { label: 'Platinum Award', value: v.platinum_award > 0 ? `${v.currency_code} ${v.platinum_award.toLocaleString()}` : '', isValid: v.platinum_award > 0 },
        { label: 'Gold Award', value: v.gold_award > 0 ? `${v.currency_code} ${v.gold_award.toLocaleString()}` : '', isValid: v.gold_award > 0 },
        { label: 'Silver Award', value: v.silver_award && v.silver_award > 0 ? `${v.currency_code} ${v.silver_award.toLocaleString()}` : '', isValid: true },
        { label: 'Rewarded Solutions', value: v.num_rewarded_solutions ?? '', isValid: true },
        
        { label: 'IP Model', value: v.ip_model ?? '', isValid: !!v.ip_model },
        { label: 'Payment Mode', value: v.payment_mode ?? '', isValid: true },
        { label: 'Rejection Fee', value: `${v.rejection_fee_pct}%`, isValid: true },
        { label: 'Payment Milestones', value: v.payment_milestones?.length ? `${v.payment_milestones.length} milestones` : '', isValid: true },
      ],
    },
    {
      title: 'Step 4: Timeline & Phases',
      step: 4,
      fields: [
        { label: 'Expected Timeline', value: v.expected_timeline ?? '', isValid: true },
        { label: 'Review Duration', value: v.review_duration ? `${v.review_duration} days` : '', isValid: true },
        { label: 'Review Duration', value: v.review_duration ? `${v.review_duration} days` : '', isValid: true },
        { label: 'Phase Notes', value: v.phase_notes ? '✓ Provided' : '', isValid: true },
        { label: 'Phase Durations', value: v.phase_durations ? `${Object.keys(v.phase_durations).length} phases configured` : '', isValid: true },
        { label: 'Complexity Notes', value: v.complexity_notes ?? '', isValid: true },
        { label: 'Complexity Parameters', value: v.complexity_params ? `${Object.keys(v.complexity_params).length} parameters` : '', isValid: true },
      ],
    },
    {
      title: 'Step 5: Provider Eligibility',
      step: 5,
      fields: [
        { label: 'Eligible Participation Modes', value: (v.eligible_participation_modes?.length ?? 0) > 0 ? `${v.eligible_participation_modes.length} selected` : 'All Categories', isValid: true },
        { label: 'Solver Tiers', value: (v.solver_eligibility_ids?.length ?? 0) > 0 ? `${v.solver_eligibility_ids.length} selected` : 'All (no restriction)', isValid: true },
        { label: 'Required Expertise Level', value: v.required_expertise_level_id ?? '', isValid: true },
        { label: 'Required Expertise Level', value: v.required_expertise_level_id ?? '', isValid: true },
        { label: 'Required Proficiencies', value: v.required_proficiencies?.length ? `${v.required_proficiencies.length} selected` : '', isValid: true },
        { label: 'Required Sub-Domains', value: v.required_sub_domains?.length ? `${v.required_sub_domains.length} selected` : '', isValid: true },
        { label: 'Required Specialities', value: v.required_specialities?.length ? `${v.required_specialities.length} selected` : '', isValid: true },
        { label: 'Eligibility', value: v.eligibility ? '✓ Provided' : '', isValid: true },
        { label: 'Permitted Artifact Types', value: v.permitted_artifact_types?.length ? `${v.permitted_artifact_types.length} types` : '', isValid: true },
      ],
    },
    {
      title: 'Step 6: Solution Templates',
      step: 6,
      fields: [
        { label: 'Solution Category Description', value: v.solution_category_description ? '✓ Provided' : '', isValid: true },
        { label: 'Solution Template', value: v.submission_template_url ? '✓ Uploaded' : 'Not uploaded', isValid: true },
      ],
    },
  ];

  // Filter out empty optional fields for cleaner display
  const filteredSections = sections.map((section) => ({
    ...section,
    fields: section.fields.filter((f) => f.value || !f.isValid),
  }));

  const totalFields = sections.flatMap((s) => s.fields);
  const requiredFields = totalFields.filter((f) => !f.isValid || f.value);
  const validCount = requiredFields.filter((f) => f.isValid).length;
  const invalidCount = requiredFields.filter((f) => !f.isValid).length;
  const allValid = invalidCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">
          Review all challenge details before submitting. Click "Edit" on any section to go back and modify.
        </p>
      </div>

      {/* Completion summary */}
      <div className={cn(
        'rounded-lg border p-3 flex items-center gap-3',
        allValid
          ? 'border-[hsl(155,68%,37%)]/30 bg-[hsl(155,68%,37%)]/5'
          : 'border-amber-300 bg-amber-50',
      )}>
        {allValid ? (
          <CheckCircle className="h-5 w-5 text-[hsl(155,68%,37%)]" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {allValid ? 'Ready to Submit' : `${invalidCount} issue(s) to resolve`}
          </p>
          <p className="text-xs text-muted-foreground">
            {allValid
              ? 'All required fields are filled. Click Submit to send for review.'
              : 'Please complete all required fields before submitting.'}
          </p>
        </div>
      </div>

      {/* Section summaries */}
      {filteredSections.map((section) => {
        if (section.fields.length === 0) return null;
        const sectionValid = section.fields.filter((f) => f.isValid).length;
        return (
          <Card key={section.title} className="border-border">
            <div className="px-4 py-2.5 border-b flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {sectionValid}/{section.fields.length}
                </Badge>
                {onNavigateToStep && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={() => onNavigateToStep(section.step)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </div>
            <CardContent className="p-4">
              {section.fields.map((field) => (
                <SummaryRow key={field.label} {...field} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
