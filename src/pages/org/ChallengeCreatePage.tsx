/**
 * Challenge Creation Page (CHG-001)
 * 
 * Form with React Hook Form + Zod validation, real-time fee calculation.
 * Implements BR-MSL-002, BR-TFR-002, BR-TFR-004.
 */

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';

import { challengeSchema, type ChallengeFormValues } from '@/lib/validations/challenge';
import { useComplexityLevels, useEngagementModels, useBaseFees, useCreateChallenge } from '@/hooks/queries/useChallengeData';
import { useOrgSubscription } from '@/hooks/queries/useBillingData';
import { useOrgMembership } from '@/hooks/queries/useMembershipData';
import { calculateChallengeFees, validateChallengeLimit, getMaxSolutions, applyMembershipDiscount } from '@/services/challengePricingService';
import { calculateMembershipDiscount } from '@/services/membershipService';
import { useOrgContext } from '@/contexts/OrgContext';
import { EngagementModelSelector } from '@/components/org/EngagementModelSelector';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Zap, DollarSign, AlertTriangle, CheckCircle, Loader2, Percent } from 'lucide-react';

export default function ChallengeCreatePage() {
  // ══════════════════════════════════════
  // SECTION 1: Context & Navigation
  // ══════════════════════════════════════
  const { organizationId, tenantId, hqCountryId, isInternalDepartment } = useOrgContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 2: Form hook
  // ══════════════════════════════════════
  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '',
      description: '',
      engagement_model_id: '',
      complexity_id: '',
    },
  });

  const watchedComplexity = form.watch('complexity_id');

  // ══════════════════════════════════════
  // SECTION 3: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: complexityLevels, isLoading: complexityLoading } = useComplexityLevels();
  const { data: engagementModels, isLoading: modelsLoading } = useEngagementModels();
  const { data: subscription } = useOrgSubscription(organizationId);
  const { data: membership } = useOrgMembership(organizationId);

  const tierId = subscription?.tier_id;
  const { data: baseFees } = useBaseFees(hqCountryId ?? '', tierId);
  const createChallenge = useCreateChallenge();

  // ══════════════════════════════════════
  // SECTION 4: Derived values
  // ══════════════════════════════════════
  const selectedComplexityData = useMemo(
    () => complexityLevels?.find((c) => c.id === watchedComplexity),
    [complexityLevels, watchedComplexity]
  );

  const basePricing = useMemo(() => {
    if (!baseFees || !selectedComplexityData) return null;
    return calculateChallengeFees(
      { consultingBaseFee: baseFees.consulting_base_fee, managementBaseFee: baseFees.management_base_fee, currencyCode: baseFees.currency_code },
      { consultingFeeMultiplier: selectedComplexityData.consulting_fee_multiplier, managementFeeMultiplier: selectedComplexityData.management_fee_multiplier }
    );
  }, [baseFees, selectedComplexityData]);

  // Apply membership discount if available
  const membershipDiscount = useMemo(() => {
    if (!membership?.md_membership_tiers) return null;
    return calculateMembershipDiscount(
      (membership.md_membership_tiers as { code: string }).code,
      isInternalDepartment,
    );
  }, [membership, isInternalDepartment]);

  const pricing = useMemo(() => {
    if (!basePricing) return null;
    if (membershipDiscount?.isEligible && membershipDiscount.feeDiscountPct > 0) {
      return applyMembershipDiscount(basePricing, membershipDiscount.feeDiscountPct);
    }
    return applyMembershipDiscount(basePricing, 0);
  }, [basePricing, membershipDiscount]);

  const challengeValidation = validateChallengeLimit(
    subscription?.challenges_used ?? 0,
    subscription?.challenge_limit_snapshot ?? null
  );

  const maxSolutions = selectedComplexityData ? getMaxSolutions(selectedComplexityData.complexity_level) : 3;
  const isLoading = complexityLoading || modelsLoading;

  // ══════════════════════════════════════
  // SECTION 5: Event handlers
  // ══════════════════════════════════════
  const handleSubmit = (data: ChallengeFormValues) => {
    if (!challengeValidation.canCreate || !pricing) return;
    createChallenge.mutate({
      tenantId,
      organizationId,
      title: data.title,
      description: data.description || undefined,
      engagementModelId: data.engagement_model_id,
      complexityId: data.complexity_id,
      consultingFee: pricing.hasDiscount ? pricing.discountedConsultingFee : pricing.consultingFee,
      managementFee: pricing.hasDiscount ? pricing.discountedManagementFee : pricing.managementFee,
      totalFee: pricing.hasDiscount ? pricing.discountedTotalFee : pricing.totalFee,
      currencyCode: pricing.currencyCode,
      maxSolutions,
      visibility: data.visibility,
    });
  };

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Challenge</h1>
        <p className="text-muted-foreground">Define your challenge and select pricing parameters</p>
      </div>

      {!challengeValidation.canCreate && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{challengeValidation.reason}</p>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Challenge Details */}
          <Card>
            <CardHeader>
              <CardTitle>Challenge Details</CardTitle>
              <CardDescription>Basic information about the challenge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter challenge title" maxLength={200} className="text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe the challenge..." rows={4} className="text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="text-base">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="marketplace">Marketplace</SelectItem>
                        <SelectItem value="invited">Invited Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Engagement Model — Card Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" /> Engagement Model
              </CardTitle>
              <CardDescription>Choose how you'll interact with solution providers. Model is locked after draft stage.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : engagementModels?.length ? (
                <FormField
                  control={form.control}
                  name="engagement_model_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <EngagementModelSelector
                          models={engagementModels.map(m => ({
                            id: m.id,
                            name: m.name,
                            code: m.code,
                            description: m.description,
                          }))}
                          selectedId={field.value}
                          onSelect={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No engagement models available.</p>
              )}
            </CardContent>
          </Card>

          {/* Complexity & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Complexity & Pricing
              </CardTitle>
              <CardDescription>Fee is calculated based on base fees × complexity multiplier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <FormField
                  control={form.control}
                  name="complexity_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select complexity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {complexityLevels?.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.complexity_label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {pricing && (
                <>
                  <Separator />

                  {/* Membership Discount Badge */}
                  {pricing.hasDiscount && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                        <Percent className="h-3 w-3" />
                        {pricing.discountPct}% Membership Discount Applied
                      </Badge>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Consulting Fee</p>
                      {pricing.hasDiscount ? (
                        <>
                          <p className="text-sm text-muted-foreground line-through">
                            {pricing.currencyCode} {pricing.consultingFee.toLocaleString()}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {pricing.currencyCode} {pricing.discountedConsultingFee.toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-foreground">
                          {pricing.currencyCode} {pricing.consultingFee.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Management Fee</p>
                      {pricing.hasDiscount ? (
                        <>
                          <p className="text-sm text-muted-foreground line-through">
                            {pricing.currencyCode} {pricing.managementFee.toLocaleString()}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {pricing.currencyCode} {pricing.discountedManagementFee.toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-foreground">
                          {pricing.currencyCode} {pricing.managementFee.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-xs text-primary">Total Fee</p>
                      {pricing.hasDiscount ? (
                        <>
                          <p className="text-sm text-muted-foreground line-through">
                            {pricing.currencyCode} {pricing.totalFee.toLocaleString()}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {pricing.currencyCode} {pricing.discountedTotalFee.toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-bold text-primary">
                          {pricing.currencyCode} {pricing.totalFee.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Max solutions: {maxSolutions}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!challengeValidation.canCreate || createChallenge.isPending}
            >
              {createChallenge.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Challenge'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
