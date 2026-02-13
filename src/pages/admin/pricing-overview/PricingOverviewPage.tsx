import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, Check, X, Crown, Users, Zap } from "lucide-react";
import {
  useSubscriptionTiers,
  useTierFeatures,
  useBillingCycles,
  useEngagementModels,
  useTierEngagementAccess,
  useShadowPricing,
} from "@/hooks/queries/usePlanSelectionData";
import { useMembershipTiers } from "@/hooks/queries/useMembershipTiers";
import { useChallengeComplexityList } from "@/hooks/queries/useChallengeComplexity";
import { useAllTierCountryPricing } from "@/hooks/queries/usePricingOverviewData";

// ============================================================
// Section Skeleton
// ============================================================
const SectionSkeleton = () => (
  <Card>
    <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
    <CardContent className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardContent>
  </Card>
);

// ============================================================
// Main Page
// ============================================================
export default function PricingOverviewPage() {
  const { data: tiers = [], isLoading: tiersLoading } = useSubscriptionTiers();
  const { data: features = [], isLoading: featuresLoading } = useTierFeatures();
  const { data: billingCycles = [], isLoading: cyclesLoading } = useBillingCycles();
  const { data: engagementModels = [], isLoading: modelsLoading } = useEngagementModels();
  const { data: tierAccess = [], isLoading: accessLoading } = useTierEngagementAccess();
  const { data: shadowPricing = [], isLoading: shadowLoading } = useShadowPricing();
  const { data: membershipTiers = [], isLoading: membershipLoading } = useMembershipTiers();
  const { data: complexity = [], isLoading: complexityLoading } = useChallengeComplexityList();
  const { data: countryPricing = [], isLoading: pricingLoading } = useAllTierCountryPricing();

  const isLoading = tiersLoading || featuresLoading || cyclesLoading || modelsLoading
    || accessLoading || shadowLoading || membershipLoading || complexityLoading || pricingLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Pricing Overview</h1>
        </div>
        <div className="grid gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SectionSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  // Build lookup maps
  const tierMap = Object.fromEntries(tiers.map(t => [t.id, t]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing & Configuration Overview</h1>
          <p className="text-sm text-muted-foreground">Consolidated view of all subscription, pricing, and feature configurations</p>
        </div>
      </div>

      {/* Section 1: Tier Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" />Subscription Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {tiers.map(tier => (
              <Card key={tier.id} className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {tier.name}
                    {tier.is_enterprise && <Badge variant="secondary">Enterprise</Badge>}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">{tier.code}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {tier.description && <p className="text-muted-foreground">{tier.description}</p>}
                  <div className="flex justify-between"><span>Max Challenges</span><Badge variant="outline">{tier.max_challenges ?? "Unlimited"}</Badge></div>
                  <div className="flex justify-between"><span>Max Users</span><Badge variant="outline">{tier.max_users ?? "Unlimited"}</Badge></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Engagement Model Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Engagement Model Access per Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Engagement Model</TableHead>
                  {tiers.map(t => <TableHead key={t.id} className="text-center">{t.name}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagementModels.map(model => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    {tiers.map(tier => {
                      const access = tierAccess.find(a => a.tier_id === tier.id && a.engagement_model_id === model.id);
                      const included = access?.access_type === "included";
                      return (
                        <TableCell key={tier.id} className="text-center">
                          {included
                            ? <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Included</Badge>
                            : <Badge variant="secondary" className="gap-1 text-muted-foreground"><X className="h-3 w-3" />Not Available</Badge>
                          }
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Tier Pricing by Country */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Pricing by Country</CardTitle>
        </CardHeader>
        <CardContent>
          {countryPricing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No country pricing configured yet.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    {tiers.map(t => <TableHead key={t.id} className="text-right">{t.name}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Group by country
                    const grouped = new Map<string, { country_name: string; currency_code: string; currency_symbol: string; prices: Record<string, { local_price: number | null; monthly_price_usd: number }> }>();
                    for (const p of countryPricing) {
                      if (!grouped.has(p.country_id)) {
                        grouped.set(p.country_id, { country_name: p.country_name, currency_code: p.currency_code, currency_symbol: p.currency_symbol, prices: {} });
                      }
                      grouped.get(p.country_id)!.prices[p.tier_id] = { local_price: p.local_price, monthly_price_usd: p.monthly_price_usd };
                    }
                    return Array.from(grouped.entries()).map(([countryId, info]) => (
                      <TableRow key={countryId}>
                        <TableCell className="font-medium">{info.country_name}</TableCell>
                        <TableCell>{info.currency_code}</TableCell>
                        {tiers.map(t => {
                          const price = info.prices[t.id];
                          if (!price) return <TableCell key={t.id} className="text-right text-muted-foreground">—</TableCell>;
                          const display = price.local_price != null
                            ? `${info.currency_symbol}${price.local_price.toLocaleString()}`
                            : `$${price.monthly_price_usd.toLocaleString()}`;
                          return <TableCell key={t.id} className="text-right font-medium">{display}/mo</TableCell>;
                        })}
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Billing Cycle Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Cycle Discounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead className="text-center">Duration</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingCycles.map(cycle => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium">{cycle.name}</TableCell>
                    <TableCell className="text-center">{cycle.months} month{cycle.months > 1 ? "s" : ""}</TableCell>
                    <TableCell className="text-right">
                      {cycle.discount_percentage > 0
                        ? <Badge variant="default">{cycle.discount_percentage}% off</Badge>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Challenge Fee Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>Challenge Fee Multipliers (Complexity)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Complexity</TableHead>
                  <TableHead className="text-center">Level</TableHead>
                  <TableHead className="text-right">Consulting Fee Multiplier</TableHead>
                  <TableHead className="text-right">Management Fee Multiplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complexity.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.complexity_label}</TableCell>
                    <TableCell className="text-center">{c.complexity_level}</TableCell>
                    <TableCell className="text-right font-mono">{c.consulting_fee_multiplier}×</TableCell>
                    <TableCell className="text-right font-mono">{c.management_fee_multiplier}×</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Membership Tier Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Membership Tier Discounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membership Tier</TableHead>
                  <TableHead className="text-center">Duration</TableHead>
                  <TableHead className="text-right">Fee Discount</TableHead>
                  <TableHead className="text-right">Commission Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membershipTiers.map(mt => (
                  <TableRow key={mt.id}>
                    <TableCell className="font-medium">{mt.name}</TableCell>
                    <TableCell className="text-center">{mt.duration_months} months</TableCell>
                    <TableCell className="text-right"><Badge variant="default">{mt.fee_discount_pct}%</Badge></TableCell>
                    <TableCell className="text-right">{mt.commission_rate_pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Shadow Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Shadow Pricing (Internal)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Shadow Charge per Challenge</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shadowPricing.map(sp => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium">{tierMap[sp.tier_id]?.name ?? sp.tier_id}</TableCell>
                    <TableCell className="text-right font-mono">
                      {sp.currency_symbol}{sp.shadow_charge_per_challenge.toLocaleString()}
                    </TableCell>
                    <TableCell>{sp.currency_code}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 8: Tier Features Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Features Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tier features configured yet.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Feature</TableHead>
                    {tiers.map(t => <TableHead key={t.id} className="text-center">{t.name}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Get unique feature codes
                    const featureCodes = [...new Set(features.map(f => f.feature_code))];
                    return featureCodes.map(code => {
                      const featureInstances = features.filter(f => f.feature_code === code);
                      const featureName = featureInstances[0]?.feature_name ?? code;
                      return (
                        <TableRow key={code}>
                          <TableCell className="font-medium">{featureName}</TableCell>
                          {tiers.map(tier => {
                            const feature = featureInstances.find(f => f.tier_id === tier.id);
                            if (!feature) {
                              return <TableCell key={tier.id} className="text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></TableCell>;
                            }
                            if (feature.access_type === "included") {
                              return <TableCell key={tier.id} className="text-center"><Check className="h-4 w-4 text-primary mx-auto" /></TableCell>;
                            }
                            if (feature.usage_limit) {
                              return <TableCell key={tier.id} className="text-center"><Badge variant="outline">{feature.usage_limit}</Badge></TableCell>;
                            }
                            return <TableCell key={tier.id} className="text-center"><Badge variant="secondary">{feature.access_type}</Badge></TableCell>;
                          })}
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
