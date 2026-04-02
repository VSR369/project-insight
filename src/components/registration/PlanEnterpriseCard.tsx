/**
 * PlanEnterpriseCard — Enterprise tier card + contact dialog.
 * Extracted from PlanSelectionForm.tsx for decomposition.
 */

import { useState } from 'react';
import { Check, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TIER_CONFIG } from './planSelectionHelpers';

interface EnterpriseTier {
  id: string;
  name: string;
  description: string | null;
}

interface PlanEnterpriseCardProps {
  tier: EnterpriseTier;
  isSelected: boolean;
  companySizeRange?: string;
  onSubmitInquiry: (data: { expected_challenge_volume: string; specific_requirements: string }) => Promise<void>;
  isPending: boolean;
}

export function PlanEnterpriseCard({
  tier, isSelected, companySizeRange, onSubmitInquiry, isPending,
}: PlanEnterpriseCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ expected_challenge_volume: '', specific_requirements: '' });
  const config = TIER_CONFIG.enterprise;

  const handleSubmit = async () => {
    await onSubmitInquiry(formData);
    setShowDialog(false);
    setFormData({ expected_challenge_volume: '', specific_requirements: '' });
  };

  return (
    <>
      <div className={cn(
        'relative flex flex-col rounded-xl border-2 p-0 transition-all overflow-hidden',
        isSelected ? `${config.borderClass} shadow-lg ring-2 ring-violet-500/20` : 'border-border hover:shadow-md border-dashed',
      )}>
        <div className="p-5 flex flex-col flex-1">
          <Badge className={cn('w-fit mb-3 text-xs', config.badgeClass)}>{tier.name}</Badge>

          <div className="mb-1"><span className="text-2xl font-bold text-foreground">Custom Pricing</span></div>
          <p className="text-xs text-muted-foreground mb-2">Negotiated per Enterprise Agreement</p>

          {tier.description && <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>}
          <Separator className="mb-4" />

          <div className="space-y-2.5 flex-1">
            {['Unlimited challenges & users', 'Dedicated account manager', 'Custom SLA & onboarding', 'SSO & advanced security', 'White-label reports', 'Full API access & webhooks'].map((feat) => (
              <div key={feat} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-foreground">{feat}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 mb-4">Custom contract — pricing negotiated per agreement</p>

          <Button type="button" variant="outline" className={cn('w-full', config.btnClass)} onClick={() => setShowDialog(true)} disabled={isPending}>
            <MessageSquare className="mr-2 h-4 w-4" />Contact Sales
          </Button>
        </div>
      </div>

      {/* Enterprise Contact Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Our Enterprise Team</DialogTitle>
            <DialogDescription>Tell us about your needs so we can tailor the right plan for you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Company Size</Label>
              <Input value={companySizeRange || 'Not specified'} readOnly className="text-base bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Expected Challenges per Month</Label>
              <Select value={formData.expected_challenge_volume} onValueChange={(val) => setFormData(prev => ({ ...prev, expected_challenge_volume: val }))}>
                <SelectTrigger className="text-base"><SelectValue placeholder="Select volume" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1–5</SelectItem>
                  <SelectItem value="6-20">6–20</SelectItem>
                  <SelectItem value="21-50">21–50</SelectItem>
                  <SelectItem value="50+">50+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Specific Requirements (Optional)</Label>
              <Textarea value={formData.specific_requirements} onChange={(e) => setFormData(prev => ({ ...prev, specific_requirements: e.target.value.slice(0, 500) }))} placeholder="Any particular needs — SLA, integrations, compliance..." className="min-h-[100px]" maxLength={500} />
              <p className="text-xs text-muted-foreground text-right">{formData.specific_requirements.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit Inquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
