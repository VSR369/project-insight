import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LayoutGrid, Check, X, Crown, ChevronDown, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useSubscriptionTiers, useTierFeatures, useBillingCycles,
  useEngagementModels, useTierEngagementAccess, useResolvedShadowPricing,
} from "@/hooks/queries/usePlanSelectionData";
import { useMembershipTiers } from "@/hooks/queries/useMembershipTiers";
import { useChallengeComplexityList } from "@/hooks/queries/useChallengeComplexity";
import { useAllTierCountryPricing, useAllPlatformFees } from "@/hooks/queries/usePricingOverviewData";
import { useBaseFees } from "@/hooks/queries/useBaseFees";

// ============================================================
// Constants
// ============================================================
const TIER_COLORS: Record<string, string> = {
  basic: "border-l-blue-500",
  standard: "border-l-purple-500",
  premium: "border-l-amber-500",
};

const AGGREGATOR_CODE = "aggregator";

// ============================================================
// Section Components
// ============================================================

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false, badge }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group">
        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
        <span>{title}</span>
        {badge}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function NotApplicableBadge({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <Badge variant="secondary" className="text-muted-foreground">
        <AlertCircle className="h-3 w-3 mr-1" />Not Applicable
      </Badge>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

function NotConfiguredMessage({ link, label }: { link: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
      <span>Not configured yet.</span>
      <Link to={link} className="text-primary hover:underline inline-flex items-center gap-1">
        Configure {label} <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ============================================================
// Tier Card
// ============================================================
interface TierCardProps {
  tier: any;
  modelCode: string;
  accessType: string | null;
  platformFeePct: number | null;
  platformFeeDesc: string | null;
  countryPricing: any[];
  baseFees: any[];
  complexity: any[];
  billingCycles: any[];
  membershipTiers: any[];
  shadowPricing: any[];
  features: any[];
  allTiers: any[];
  engagementModels: any[];
}

function TierCard({
  tier, modelCode, accessType, platformFeePct, platformFeeDesc,
  countryPricing, baseFees, complexity, billingCycles,
  membershipTiers, shadowPricing, features, allTiers, engagementModels,
}: TierCardProps) {
  const colorClass = TIER_COLORS[tier.code?.toLowerCase()] ?? "border-l-muted";
  const isAggregator = modelCode === AGGREGATOR_CODE;
  const tierPricing = countryPricing.filter(p => p.tier_id === tier.id);
  const marketplaceModel = engagementModels?.find((m: any) => m.code?.toLowerCase() === 'marketplace');
  const tierBaseFees = baseFees.filter((bf: any) =>
    bf.tier_id === tier.id &&
    (!isAggregator ? bf.engagement_model_id === marketplaceModel?.id : false)
  );
  const tierShadow = shadowPricing.filter((sp: any) => sp.tier_id === tier.id);
  const tierFeatures = features.filter((f: any) => f.tier_id === tier.id);

  return (
    <Card className={`border-l-4 ${colorClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {tier.name}
            {tier.is_enterprise && <Badge variant="secondary">Enterprise</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {accessType === "included" ? (
              <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Included</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />Not Available</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
          <span>Max Challenges: <strong>{tier.max_challenges ?? "Unlimited"}</strong></span>
          <span>Max Users: <strong>{tier.max_users ?? "Unlimited"}</strong></span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 divide-y divide-border">
        {/* Platform Fee */}
        <CollapsibleSection title="Platform Fee" defaultOpen badge={
          platformFeePct != null ? <Badge variant="outline">{platformFeePct}%</Badge> : null
        }>
          {platformFeePct != null ? (
            <div className="text-sm">
              <span className="font-medium">{platformFeePct}%</span> of award/fee paid to provider
              {platformFeeDesc && <p className="text-muted-foreground text-xs mt-1">{platformFeeDesc}</p>}
            </div>
          ) : (
            <NotConfiguredMessage link="/admin/seeker-config/platform-fees" label="Platform Fees" />
          )}
        </CollapsibleSection>

        {/* Subscription Pricing */}
        <CollapsibleSection title="Subscription Pricing" badge={
          <Badge variant="outline">{tierPricing.length} countries</Badge>
        }>
          {tierPricing.length === 0 ? (
            <NotConfiguredMessage link="/admin/seeker-config/subscription-tiers" label="Pricing" />
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Monthly Price</TableHead>
                    <TableHead className="text-right">Local Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tierPricing.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.country_name}</TableCell>
                      <TableCell>{p.currency_code}</TableCell>
                      <TableCell className="text-right">${p.monthly_price_usd}</TableCell>
                      <TableCell className="text-right">
                        {p.local_price != null ? `${p.currency_symbol}${p.local_price.toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CollapsibleSection>

        {/* Challenge Base Fees */}
        <CollapsibleSection title="Challenge Base Fees">
          {isAggregator ? (
            <NotApplicableBadge label="Aggregator model does not have consulting or management fees" />
          ) : tierBaseFees.length === 0 ? (
            <NotConfiguredMessage link="/admin/seeker-config/base-fees" label="Base Fees" />
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Consulting Fee</TableHead>
                    <TableHead className="text-right">Management Fee</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tierBaseFees.map((bf: any) => (
                    <TableRow key={bf.id}>
                      <TableCell className="font-medium">{bf.countries?.name ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{bf.consulting_base_fee}</TableCell>
                      <TableCell className="text-right font-mono">{bf.management_base_fee}</TableCell>
                      <TableCell>{bf.currency_code}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CollapsibleSection>

        {/* Complexity Multipliers */}
        <CollapsibleSection title="Complexity Multipliers">
          {isAggregator ? (
            <NotApplicableBadge label="Aggregator model does not use fee multipliers" />
          ) : complexity.length === 0 ? (
            <NotConfiguredMessage link="/admin/seeker-config/challenge-complexity" label="Complexity" />
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Complexity</TableHead>
                    <TableHead className="text-right">Consulting ×</TableHead>
                    <TableHead className="text-right">Management ×</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complexity.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.complexity_label}</TableCell>
                      <TableCell className="text-right font-mono">{c.consulting_fee_multiplier}×</TableCell>
                      <TableCell className="text-right font-mono">{c.management_fee_multiplier}×</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CollapsibleSection>

        {/* Billing Discounts */}
        <CollapsibleSection title="Billing Cycle Discounts">
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
                    <TableCell className="text-center">{cycle.months} mo</TableCell>
                    <TableCell className="text-right">
                      {cycle.discount_percentage > 0
                        ? <Badge variant="default">{cycle.discount_percentage}%</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>

        {/* Membership Discounts */}
        <CollapsibleSection title="Membership Discounts">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-center">Duration</TableHead>
                  <TableHead className="text-right">Fee Discount</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membershipTiers.map(mt => (
                  <TableRow key={mt.id}>
                    <TableCell className="font-medium">{mt.name}</TableCell>
                    <TableCell className="text-center">{mt.duration_months} mo</TableCell>
                    <TableCell className="text-right"><Badge variant="default">{mt.fee_discount_pct}%</Badge></TableCell>
                    <TableCell className="text-right">{mt.commission_rate_pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>

        {/* Shadow Pricing */}
        <CollapsibleSection title="Shadow Pricing">
          {tierShadow.length === 0 ? (
            <NotConfiguredMessage link="/admin/seeker-config/shadow-pricing" label="Shadow Pricing" />
          ) : (
            <div className="text-sm space-y-1">
              {tierShadow.map((sp: any) => (
                <div key={sp.id} className="flex items-center gap-2">
                  <span className="font-mono font-medium">{sp.currency_symbol}{sp.shadow_charge_per_challenge.toLocaleString()}</span>
                  <span className="text-muted-foreground">{sp.currency_code} per challenge</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Features */}
        <CollapsibleSection title="Features" badge={
          <Badge variant="outline">{tierFeatures.length}</Badge>
        }>
          {tierFeatures.length === 0 ? (
            <NotConfiguredMessage link="/admin/seeker-config/subscription-tiers" label="Features" />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
                {tierFeatures.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm py-0.5">
                    {f.access_type === "included" ? (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className={f.access_type !== "included" ? "text-muted-foreground line-through" : ""}>
                      {f.feature_name}
                    </span>
                  </div>
                ))}
              </div>
              {tierFeatures.some((f: any) => f.description) && (
                <div className="pt-1 border-t border-border">
                  {tierFeatures.filter((f: any) => f.description).map((f: any) => (
                    <p key={f.id} className="text-xs text-muted-foreground italic">+ {f.description}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Summary Tab
// ============================================================
function SummaryTab({ tiers, engagementModels, tierAccess, platformFees, billingCycles, complexity, countryPricing, baseFees, shadowPricing, membershipTiers, features }: {
  tiers: any[]; engagementModels: any[]; tierAccess: any[]; platformFees: any[];
  billingCycles: any[]; complexity: any[]; countryPricing: any[]; baseFees: any[];
  shadowPricing: any[]; membershipTiers: any[]; features: any[];
}) {
  // Group country pricing by country for cross-tier comparison
  const pricingByCountry = countryPricing.reduce((acc: Record<string, any>, p: any) => {
    if (!acc[p.country_id]) acc[p.country_id] = { country_name: p.country_name, currency_code: p.currency_code, tiers: {} };
    acc[p.country_id].tiers[p.tier_id] = p.monthly_price_usd;
    return acc;
  }, {} as Record<string, any>);

  // Group base fees by country for cross-tier comparison (Marketplace only)
  const marketplaceModel = engagementModels.find((m: any) => m.code?.toLowerCase() === 'marketplace');
  const marketplaceBaseFees = baseFees.filter((bf: any) => bf.engagement_model_id === marketplaceModel?.id);
  const baseFeesByCountry = marketplaceBaseFees.reduce((acc: Record<string, any>, bf: any) => {
    const countryName = bf.countries?.name ?? "Unknown";
    const countryId = bf.country_id;
    if (!acc[countryId]) acc[countryId] = { country_name: countryName, currency_code: bf.currency_code, tiers: {} };
    acc[countryId].tiers[bf.tier_id] = { consulting: bf.consulting_base_fee, management: bf.management_base_fee };
    return acc;
  }, {} as Record<string, any>);

  // Collect unique feature names across all tiers, preserving order
  const featureNames: string[] = [];
  const featureMap: Record<string, Record<string, { access_type: string; description: string | null }>> = {};
  features.forEach((f: any) => {
    if (!featureMap[f.feature_name]) {
      featureMap[f.feature_name] = {};
      featureNames.push(f.feature_name);
    }
    featureMap[f.feature_name][f.tier_id] = { access_type: f.access_type, description: f.description };
  });

  // Collect per-tier description notes for features footer
  const tierDescriptionNotes: Record<string, string[]> = {};
  features.forEach((f: any) => {
    if (f.description) {
      if (!tierDescriptionNotes[f.tier_id]) tierDescriptionNotes[f.tier_id] = [];
      if (!tierDescriptionNotes[f.tier_id].includes(f.description)) {
        tierDescriptionNotes[f.tier_id].push(f.description);
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Access Matrix */}
      <Card>
        <CardHeader><CardTitle>Engagement Model × Tier Access</CardTitle></CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Model</TableHead>
                  {tiers.map(t => <TableHead key={t.id} className="text-center">{t.name}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagementModels.map(model => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    {tiers.map(tier => {
                      const access = tierAccess.find((a: any) => a.tier_id === tier.id && a.engagement_model_id === model.id);
                      const included = access?.access_type === "included";
                      return (
                        <TableCell key={tier.id} className="text-center">
                          {included
                            ? <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Included</Badge>
                            : <Badge variant="secondary" className="gap-1"><X className="h-3 w-3" />N/A</Badge>}
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

      {/* Platform Fees Matrix */}
      <Card>
        <CardHeader><CardTitle>Platform Fees Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Model</TableHead>
                  {tiers.map(t => <TableHead key={t.id} className="text-center">{t.name}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagementModels.map(model => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    {tiers.map(tier => {
                      const fee = platformFees.find((f: any) => f.engagement_model_id === model.id && f.tier_id === tier.id);
                      return (
                        <TableCell key={tier.id} className="text-center">
                          {fee ? <Badge variant="outline">{fee.platform_fee_pct}%</Badge> : <span className="text-muted-foreground">—</span>}
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

      {/* Subscription Pricing */}
      <Card>
        <CardHeader><CardTitle>Subscription Pricing by Country</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(pricingByCountry).length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscription pricing configured.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Country</TableHead>
                    {tiers.map(t => <TableHead key={t.id} className="text-right">{t.name} (USD/mo)</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(pricingByCountry).map(([countryId, info]: [string, any]) => (
                    <TableRow key={countryId}>
                      <TableCell className="font-medium">{info.country_name}</TableCell>
                      {tiers.map(tier => (
                        <TableCell key={tier.id} className="text-right font-mono">
                          {info.tiers[tier.id] != null ? `$${info.tiers[tier.id]}` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenge Base Fees */}
      <Card>
        <CardHeader><CardTitle>Challenge Base Fees</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(baseFeesByCountry).length === 0 ? (
            <p className="text-sm text-muted-foreground">No base fees configured.</p>
          ) : (
            <div className="space-y-2">
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Country</TableHead>
                      {tiers.map(t => (
                        <React.Fragment key={t.id}>
                          <TableHead className="text-right">{t.name} Consulting</TableHead>
                          <TableHead className="text-right">{t.name} Mgmt</TableHead>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(baseFeesByCountry).map(([countryId, info]: [string, any]) => (
                      <TableRow key={countryId}>
                        <TableCell className="font-medium">{info.country_name}</TableCell>
                        {tiers.map(tier => (
                          <React.Fragment key={tier.id}>
                            <TableCell className="text-right font-mono">
                              {info.tiers[tier.id]?.consulting != null ? info.tiers[tier.id].consulting : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {info.tiers[tier.id]?.management != null ? info.tiers[tier.id].management : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground italic">Applicable to Marketplace model only. Aggregator model does not use consulting/management fees.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shadow Pricing */}
      <Card>
        <CardHeader><CardTitle>Shadow Pricing (Internal Departments)</CardTitle></CardHeader>
        <CardContent>
          {shadowPricing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shadow pricing configured.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Metric</TableHead>
                    {tiers.map(t => <TableHead key={t.id} className="text-right">{t.name}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Charge per Challenge</TableCell>
                    {tiers.map(tier => {
                      const sp = shadowPricing.find((s: any) => s.tier_id === tier.id);
                      return (
                        <TableCell key={tier.id} className="text-right font-mono">
                          {sp ? `${sp.currency_symbol}${sp.shadow_charge_per_challenge.toLocaleString()} ${sp.currency_code}` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Membership Discounts */}
      <Card>
        <CardHeader><CardTitle>Membership Discounts</CardTitle></CardHeader>
        <CardContent>
          {membershipTiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No membership tiers configured.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead className="text-right">Fee Discount</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membershipTiers.map((mt: any) => (
                    <TableRow key={mt.id}>
                      <TableCell className="font-medium">{mt.name}</TableCell>
                      <TableCell className="text-center">{mt.duration_months} mo</TableCell>
                      <TableCell className="text-right"><Badge variant="default">{mt.fee_discount_pct}%</Badge></TableCell>
                      <TableCell className="text-right">{mt.commission_rate_pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Discounts */}
      <Card>
        <CardHeader><CardTitle>Billing Cycle Discounts</CardTitle></CardHeader>
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
                    <TableCell className="text-center">{cycle.months} months</TableCell>
                    <TableCell className="text-right">
                      {cycle.discount_percentage > 0 ? <Badge variant="default">{cycle.discount_percentage}%</Badge> : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Complexity */}
      <Card>
        <CardHeader><CardTitle>Challenge Fee Multipliers</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Complexity</TableHead>
                    <TableHead className="text-center">Level</TableHead>
                    <TableHead className="text-right">Consulting ×</TableHead>
                    <TableHead className="text-right">Management ×</TableHead>
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
            <p className="text-xs text-muted-foreground italic">Applicable to Marketplace model only.</p>
          </div>
        </CardContent>
      </Card>

      {/* Tier Features Comparison */}
      <Card>
        <CardHeader><CardTitle>Tier Features Comparison</CardTitle></CardHeader>
        <CardContent>
          {featureNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">No features configured.</p>
          ) : (
            <div className="space-y-2">
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Feature</TableHead>
                      {tiers.map(t => <TableHead key={t.id} className="text-center">{t.name}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureNames.map(name => (
                      <TableRow key={name}>
                        <TableCell className="font-medium text-sm">{name}</TableCell>
                        {tiers.map(tier => {
                          const f = featureMap[name]?.[tier.id];
                          const included = f?.access_type === "included";
                          return (
                            <TableCell key={tier.id} className="text-center">
                              {f ? (
                                included
                                  ? <Check className="h-4 w-4 text-primary mx-auto" />
                                  : <X className="h-4 w-4 text-destructive mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Description notes per tier */}
              {tiers.some(t => tierDescriptionNotes[t.id]?.length) && (
                <div className="flex gap-6 pt-1 border-t border-border">
                  {tiers.map(t => (
                    tierDescriptionNotes[t.id]?.length ? (
                      <div key={t.id} className="text-xs text-muted-foreground italic">
                        <span className="font-medium not-italic">{t.name}:</span>{" "}
                        {tierDescriptionNotes[t.id].map((d, i) => <span key={i}>+ {d}{i < tierDescriptionNotes[t.id].length - 1 ? "; " : ""}</span>)}
                      </div>
                    ) : null
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
  const { data: platformFees = [], isLoading: platformFeesLoading } = useAllPlatformFees();
  const { data: baseFees = [], isLoading: baseFeesLoading } = useBaseFees();

  const isLoading = tiersLoading || featuresLoading || cyclesLoading || modelsLoading
    || accessLoading || shadowLoading || membershipLoading || complexityLoading
    || pricingLoading || platformFeesLoading || baseFeesLoading;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing & Configuration Overview</h1>
          <p className="text-sm text-muted-foreground">Engagement model-centric view of all pricing, fees, and feature configurations</p>
        </div>
      </div>

      <Tabs defaultValue={engagementModels[0]?.code?.toLowerCase() ?? "marketplace"} className="w-full">
        <TabsList>
          {engagementModels.map(model => (
            <TabsTrigger key={model.id} value={model.code.toLowerCase()}>
              {model.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {engagementModels.map(model => (
          <TabsContent key={model.id} value={model.code.toLowerCase()} className="space-y-4 mt-4">
            {tiers.map(tier => {
              const access = tierAccess.find((a: any) => a.tier_id === tier.id && a.engagement_model_id === model.id);
              const fee = platformFees.find((f: any) => f.engagement_model_id === model.id && f.tier_id === tier.id);

              return (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  modelCode={model.code.toLowerCase()}
                  accessType={access?.access_type ?? null}
                  platformFeePct={fee?.platform_fee_pct ?? null}
                  platformFeeDesc={fee?.description ?? null}
                  countryPricing={countryPricing}
                  baseFees={baseFees}
                  engagementModels={engagementModels}
                  complexity={complexity}
                  billingCycles={billingCycles}
                  membershipTiers={membershipTiers}
                  shadowPricing={shadowPricing}
                  features={features}
                  allTiers={tiers}
                />
              );
            })}
          </TabsContent>
        ))}

        <TabsContent value="summary" className="mt-4">
          <SummaryTab
            tiers={tiers}
            engagementModels={engagementModels}
            tierAccess={tierAccess}
            platformFees={platformFees}
            billingCycles={billingCycles}
            complexity={complexity}
            countryPricing={countryPricing}
            baseFees={baseFees}
            shadowPricing={shadowPricing}
            membershipTiers={membershipTiers}
            features={features}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
