/**
 * Step 7 — Review & Submit
 * Read-only summary of all fields across steps 1-6.
 */

import { UseFormReturn } from 'react-hook-form';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

interface StepReviewSubmitProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
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
        <p className={cn('text-sm', isValid ? 'text-foreground' : 'text-destructive italic')}>
          {value || 'Not provided'}
        </p>
      </div>
    </div>
  );
}

export function StepReviewSubmit({ form, isLightweight }: StepReviewSubmitProps) {
  const v = form.getValues();

  const sections = [
    {
      title: 'Challenge Brief',
      fields: [
        { label: 'Title', value: v.title, isValid: !!v.title },
        { label: 'Problem Statement', value: v.problem_statement ? `${v.problem_statement.length} characters` : '', isValid: !!v.problem_statement },
        { label: 'Domain Tags', value: v.domain_tags?.join(', ') ?? '', isValid: (v.domain_tags?.length ?? 0) > 0 },
        { label: 'Maturity Level', value: v.maturity_level ?? '', isValid: !!v.maturity_level },
        { label: 'Context & Background', value: v.context_background ? '✓ Provided' : '', isValid: true },
      ],
    },
    {
      title: 'Evaluation Criteria',
      fields: [
        { label: 'Criteria Count', value: `${v.weighted_criteria?.length ?? 0} criteria`, isValid: (v.weighted_criteria?.length ?? 0) > 0 },
        { label: 'Total Weight', value: `${v.weighted_criteria?.reduce((s, c) => s + c.weight, 0) ?? 0}%`, isValid: (v.weighted_criteria?.reduce((s, c) => s + c.weight, 0) ?? 0) === 100 },
      ],
    },
    {
      title: 'Rewards & Payment',
      fields: [
        { label: 'Currency', value: v.currency_code, isValid: !!v.currency_code },
        { label: 'Platinum Award', value: v.platinum_award > 0 ? `${v.currency_code} ${v.platinum_award.toLocaleString()}` : '', isValid: v.platinum_award > 0 },
        { label: 'Gold Award', value: v.gold_award > 0 ? `${v.currency_code} ${v.gold_award.toLocaleString()}` : '', isValid: v.gold_award > 0 },
      ],
    },
    {
      title: 'Timeline',
      fields: [
        { label: 'Submission Deadline', value: v.submission_deadline ?? '', isValid: !!v.submission_deadline },
        { label: 'Expected Timeline', value: v.expected_timeline ?? '', isValid: true },
      ],
    },
    {
      title: 'Provider Eligibility',
      fields: [
        { label: 'Solver Types', value: v.solver_eligibility_types?.join(', ') ?? '', isValid: (v.solver_eligibility_types?.length ?? 0) > 0 },
        { label: 'IP Model', value: v.ip_model ?? '', isValid: true },
      ],
    },
  ];

  const totalFields = sections.flatMap((s) => s.fields);
  const validCount = totalFields.filter((f) => f.isValid).length;
  const allValid = validCount === totalFields.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">
          Review all challenge details before submitting for review.
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
            {allValid ? 'Ready to Submit' : `${validCount}/${totalFields.length} fields complete`}
          </p>
          <p className="text-xs text-muted-foreground">
            {allValid
              ? 'All required fields are filled. Click Submit to send for review.'
              : 'Please complete all required fields before submitting.'}
          </p>
        </div>
      </div>

      {/* Section summaries */}
      {sections.map((section) => (
        <Card key={section.title} className="border-border">
          <div className="px-4 py-2.5 border-b flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            <Badge variant="outline" className="text-[10px]">
              {section.fields.filter((f) => f.isValid).length}/{section.fields.length}
            </Badge>
          </div>
          <CardContent className="p-4">
            {section.fields.map((field) => (
              <SummaryRow key={field.label} {...field} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
