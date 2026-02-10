import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useComplexityLevels, useEngagementModels, useBaseFees, useCreateChallenge } from '@/hooks/queries/useChallengeData';
import { useOrgSubscription } from '@/hooks/queries/useBillingData';
import { calculateChallengeFees, validateChallengeLimit, getMaxSolutions } from '@/services/challengePricingService';
import { Zap, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEMO_ORG_ID = 'demo-org-id';
const DEMO_TENANT_ID = 'demo-tenant-id';
const DEMO_COUNTRY_ID = 'demo-country-id';

export default function ChallengeCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState('');

  const { data: complexityLevels, isLoading: complexityLoading } = useComplexityLevels();
  const { data: engagementModels, isLoading: modelsLoading } = useEngagementModels();
  const { data: subscription } = useOrgSubscription(DEMO_ORG_ID);

  const tierId = subscription?.tier_id;
  const { data: baseFees } = useBaseFees(DEMO_COUNTRY_ID, tierId);
  const createChallenge = useCreateChallenge();

  const selectedComplexityData = useMemo(
    () => complexityLevels?.find((c) => c.id === selectedComplexity),
    [complexityLevels, selectedComplexity]
  );

  const pricing = useMemo(() => {
    if (!baseFees || !selectedComplexityData) return null;
    return calculateChallengeFees(
      { consultingBaseFee: baseFees.consulting_base_fee, managementBaseFee: baseFees.management_base_fee, currencyCode: baseFees.currency_code },
      { consultingFeeMultiplier: selectedComplexityData.consulting_fee_multiplier, managementFeeMultiplier: selectedComplexityData.management_fee_multiplier }
    );
  }, [baseFees, selectedComplexityData]);

  const challengeValidation = validateChallengeLimit(
    subscription?.challenges_used ?? 0,
    subscription?.challenge_limit_snapshot ?? null
  );

  const maxSolutions = selectedComplexityData ? getMaxSolutions(selectedComplexityData.complexity_level) : 3;

  const canSubmit = title.trim() && selectedModel && selectedComplexity && challengeValidation.canCreate;

  const handleSubmit = () => {
    if (!canSubmit || !pricing) return;
    createChallenge.mutate({
      tenantId: DEMO_TENANT_ID,
      organizationId: DEMO_ORG_ID,
      title: title.trim(),
      description: description.trim() || undefined,
      engagementModelId: selectedModel,
      complexityId: selectedComplexity,
      consultingFee: pricing.consultingFee,
      managementFee: pricing.managementFee,
      totalFee: pricing.totalFee,
      currencyCode: pricing.currencyCode,
      maxSolutions,
      visibility: 'private',
    });
  };

  const isLoading = complexityLoading || modelsLoading;

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

      {/* Challenge Details */}
      <Card>
        <CardHeader>
          <CardTitle>Challenge Details</CardTitle>
          <CardDescription>Basic information about the challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter challenge title" maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the challenge..." rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* Engagement Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Engagement Model</CardTitle>
          <CardDescription>BR-MSL-002: Model is locked after draft stage</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger><SelectValue placeholder="Select engagement model" /></SelectTrigger>
              <SelectContent>
                {engagementModels?.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      {model.description && <span className="text-xs text-muted-foreground">{model.description}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Complexity & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Complexity & Pricing</CardTitle>
          <CardDescription>Fee is calculated based on base fees × complexity multiplier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
              <SelectTrigger><SelectValue placeholder="Select complexity level" /></SelectTrigger>
              <SelectContent>
                {complexityLevels?.map((level) => (
                  <SelectItem key={level.id} value={level.id}>{level.complexity_label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {pricing && (
            <>
              <Separator />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Consulting Fee</p>
                  <p className="text-lg font-semibold text-foreground">{pricing.currencyCode} {pricing.consultingFee.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Management Fee</p>
                  <p className="text-lg font-semibold text-foreground">{pricing.currencyCode} {pricing.managementFee.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-primary">Total Fee</p>
                  <p className="text-lg font-bold text-primary">{pricing.currencyCode} {pricing.totalFee.toLocaleString()}</p>
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
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || createChallenge.isPending}>
          {createChallenge.isPending ? 'Creating...' : 'Create Challenge'}
        </Button>
      </div>
    </div>
  );
}
