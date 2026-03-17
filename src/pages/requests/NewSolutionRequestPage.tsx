/**
 * New Solution Request Page
 * Route: /requests/new
 * Allows seekers to submit a new solution request with structured fields.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Send, X, Search } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
] as const;

const TIMELINE_OPTIONS = [
  { value: '1-3', label: '1–3 months' },
  { value: '3-6', label: '3–6 months' },
  { value: '6-12', label: '6–12 months' },
  { value: '12+', label: '12+ months' },
] as const;

const DEFAULT_DOMAIN_TAGS = [
  'AI/ML',
  'Biotech',
  'Clean Energy',
  'Materials Science',
  'Digital Health',
  'Manufacturing',
  'Software',
  'Sustainability',
];

const URGENCY_OPTIONS = [
  { value: 'standard', label: 'Standard', colorClass: 'bg-muted text-muted-foreground border-border' },
  { value: 'urgent', label: 'Urgent', colorClass: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'critical', label: 'Critical', colorClass: 'bg-red-50 text-red-700 border-red-300' },
] as const;

const MIN_PROBLEM_CHARS = 200;

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const solutionRequestSchema = z.object({
  business_problem: z.string()
    .min(MIN_PROBLEM_CHARS, `Business problem must be at least ${MIN_PROBLEM_CHARS} characters`)
    .max(5000, 'Business problem must be 5000 characters or less')
    .trim(),
  expected_outcomes: z.string()
    .min(1, 'Expected outcomes are required')
    .max(2000, 'Expected outcomes must be 2000 characters or less')
    .trim(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR'], {
    errorMap: () => ({ message: 'Please select a currency' }),
  }),
  budget_min: z.coerce.number().min(0, 'Minimum budget must be 0 or more'),
  budget_max: z.coerce.number().min(1, 'Maximum budget is required'),
  expected_timeline: z.enum(['1-3', '3-6', '6-12', '12+'], {
    errorMap: () => ({ message: 'Please select a timeline' }),
  }),
  domain_tags: z.array(z.string()).min(1, 'At least one domain tag is required'),
  urgency: z.enum(['standard', 'urgent', 'critical']).default('standard'),
}).refine(data => data.budget_min < data.budget_max, {
  message: 'Minimum must be less than maximum.',
  path: ['budget_min'],
});

type SolutionRequestFormValues = z.infer<typeof solutionRequestSchema>;

// ============================================================================
// DOMAIN TAG MULTI-SELECT COMPONENT
// ============================================================================

interface DomainTagSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}

function DomainTagSelect({ value, onChange, error }: DomainTagSelectProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = DEFAULT_DOMAIN_TAGS.filter(
    tag => tag.toLowerCase().includes(search.toLowerCase()) && !value.includes(tag)
  );

  const addTag = useCallback((tag: string) => {
    onChange([...value, tag]);
    setSearch('');
    setShowDropdown(false);
  }, [value, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter(t => t !== tag));
  }, [value, onChange]);

  const TAG_COLORS: Record<string, string> = {
    'AI/ML': 'bg-violet-100 text-violet-700 border-violet-200',
    'Biotech': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Clean Energy': 'bg-green-100 text-green-700 border-green-200',
    'Materials Science': 'bg-sky-100 text-sky-700 border-sky-200',
    'Digital Health': 'bg-pink-100 text-pink-700 border-pink-200',
    'Manufacturing': 'bg-orange-100 text-orange-700 border-orange-200',
    'Software': 'bg-blue-100 text-blue-700 border-blue-200',
    'Sustainability': 'bg-teal-100 text-teal-700 border-teal-200',
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Domain Tags <span className="text-destructive">*</span>
      </Label>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className={cn('gap-1 pr-1 border', TAG_COLORS[tag] || 'bg-secondary text-secondary-foreground')}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search domain tags..."
            className="pl-9"
          />
        </div>

        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.map(tag => (
              <button
                key={tag}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => addTag(tag)}
              >
                <Badge
                  variant="outline"
                  className={cn('text-xs border', TAG_COLORS[tag] || 'bg-secondary')}
                >
                  {tag}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NewSolutionRequestPage() {
  const navigate = useNavigate();

  const form = useForm<SolutionRequestFormValues>({
    resolver: zodResolver(solutionRequestSchema),
    defaultValues: {
      business_problem: '',
      expected_outcomes: '',
      currency: 'USD',
      budget_min: 0,
      budget_max: 0,
      expected_timeline: undefined,
      domain_tags: [],
      urgency: 'standard',
    },
    mode: 'onBlur',
  });

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = form;

  const businessProblem = watch('business_problem');
  const charCount = businessProblem?.length || 0;
  const isMinMet = charCount >= MIN_PROBLEM_CHARS;

  const onSubmit = async (data: SolutionRequestFormValues) => {
    try {
      // TODO: Save to Supabase solution_requests table
      console.log('Solution request data:', data);
      toast.success('Solution request created successfully');
      navigate(-1);
    } catch (error) {
      toast.error('Failed to create solution request');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-[720px] mx-auto space-y-6">
        {/* Page Title */}
        <h1 className="text-[22px] font-bold text-primary">
          New Solution Request
        </h1>

        {/* Form Card */}
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* 1. Business Problem */}
              <div className="space-y-2">
                <Label htmlFor="business_problem" className="text-sm font-medium">
                  Describe the business problem you want to solve <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="business_problem"
                  {...register('business_problem')}
                  className="min-h-[120px] resize-y"
                  placeholder="Describe the core business challenge, its impact, and what you've tried so far..."
                />
                <p className={cn(
                  'text-xs transition-colors',
                  isMinMet ? 'text-green-600' : 'text-muted-foreground'
                )}>
                  {charCount} / {MIN_PROBLEM_CHARS} minimum characters
                </p>
                {errors.business_problem && (
                  <p className="text-sm text-destructive">{errors.business_problem.message}</p>
                )}
              </div>

              {/* 2. Expected Outcomes */}
              <div className="space-y-2">
                <Label htmlFor="expected_outcomes" className="text-sm font-medium">
                  What outcomes do you expect from a successful solution? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="expected_outcomes"
                  {...register('expected_outcomes')}
                  className="min-h-[80px] resize-y"
                  placeholder="Describe measurable outcomes, KPIs, or success criteria..."
                />
                {errors.expected_outcomes && (
                  <p className="text-sm text-destructive">{errors.expected_outcomes.message}</p>
                )}
              </div>

              {/* 3. Budget Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Budget Range <span className="text-destructive">*</span></Label>
                <div className="flex flex-col lg:flex-row gap-3">
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full lg:w-[140px]">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Minimum Budget"
                      {...register('budget_min')}
                      min={0}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Maximum Budget"
                      {...register('budget_max')}
                      min={0}
                    />
                  </div>
                </div>
                {errors.budget_min && (
                  <p className="text-sm text-destructive">{errors.budget_min.message}</p>
                )}
                {errors.budget_max && (
                  <p className="text-sm text-destructive">{errors.budget_max.message}</p>
                )}
              </div>

              {/* 4. Expected Timeline */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Expected Timeline <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="expected_timeline"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select expected timeline" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMELINE_OPTIONS.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.expected_timeline && (
                  <p className="text-sm text-destructive">{errors.expected_timeline.message}</p>
                )}
              </div>

              {/* 5. Domain Tags */}
              <Controller
                name="domain_tags"
                control={control}
                render={({ field }) => (
                  <DomainTagSelect
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.domain_tags?.message}
                  />
                )}
              />

              {/* 6. Urgency */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Urgency</Label>
                <Controller
                  name="urgency"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col sm:flex-row gap-3"
                    >
                      {URGENCY_OPTIONS.map(opt => (
                        <label
                          key={opt.value}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-4 py-3 cursor-pointer transition-all',
                            field.value === opt.value
                              ? opt.colorClass
                              : 'border-border bg-background hover:bg-accent/50'
                          )}
                        >
                          <RadioGroupItem value={opt.value} />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
