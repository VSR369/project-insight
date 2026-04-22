/**
 * RecommendedEscrowCard — Surfaces governance-/engagement-mode context
 * and the Curator/Creator escrow recommendation to the FC, just above
 * the deposit form (S7B-2).
 *
 * Pure presentation. Reads from usePreviewData (already needed for
 * FcChallengeDetailView) so no extra DB round-trip.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';

interface RecommendedEscrowCardProps {
  challengeId: string;
}

interface RewardLine { label: string; amount: number }

function parseRewardLines(reward: unknown): { lines: RewardLine[]; total: number } {
  if (!reward || typeof reward !== 'object') return { lines: [], total: 0 };
  const r = reward as Record<string, unknown>;
  const lines: RewardLine[] = [];
  const platinum = Number(r.platinum_award ?? 0);
  const gold = Number(r.gold_award ?? 0);
  const silver = Number(r.silver_award ?? 0);
  if (platinum > 0) lines.push({ label: 'Platinum', amount: platinum });
  if (gold > 0) lines.push({ label: 'Gold', amount: gold });
  if (silver > 0) lines.push({ label: 'Silver', amount: silver });
  let total = platinum + gold + silver;
  if (total === 0) total = Number(r.budget_max ?? r.budget_min ?? 0);
  return { lines, total };
}

export function RecommendedEscrowCard({ challengeId }: RecommendedEscrowCardProps) {
  const data = usePreviewData(challengeId);

  if (data.isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-5 w-1/3 mb-2" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data.challenge) return null;

  const ch = data.challenge;
  const govMode = resolveGovernanceMode(
    ch.governance_mode_override ?? ch.governance_profile,
  );
  const isControlled = isControlledMode(govMode);
  const opModel = ch.operating_model ?? 'IP';
  const currency = (ch as unknown as Record<string, unknown>).currency_code as string ?? 'USD';
  const { lines, total } = parseRewardLines(ch.reward_structure);

  // Curator/Creator notes (free-text in extended_brief; optional)
  const eb = (ch as unknown as Record<string, unknown>).extended_brief;
  const ebRecord = (typeof eb === 'string'
    ? (() => { try { return JSON.parse(eb); } catch { return {}; } })()
    : (eb ?? {})) as Record<string, unknown>;
  const escrowNotes = (ebRecord.escrow_notes as string | undefined) ?? null;
  const recommendedAmount = Number(ebRecord.recommended_escrow_amount ?? 0);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Banknote className="h-4 w-4 text-primary" />
          Escrow Recommendation
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            Source: Challenge context
          </Badge>
          <GovernanceProfileBadge profile={govMode} compact />
          <Badge variant="secondary" className="text-[10px]">
            Engagement: {opModel}
          </Badge>
          <Badge
            variant={isControlled ? 'default' : 'outline'}
            className="text-[10px]"
          >
            Escrow {isControlled ? 'Mandatory' : 'Optional'}
          </Badge>
        </div>

        {lines.length > 0 && (
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Reward breakdown
            </p>
            <div className="space-y-1.5">
              {lines.map((l) => (
                <div key={l.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-mono font-medium">
                    {currency} {l.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-bold">
                  {currency} {total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {recommendedAmount > 0 && recommendedAmount !== total && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Creator/Curator recommended escrow:{' '}
              <strong>
                {currency} {recommendedAmount.toLocaleString()}
              </strong>
              . This is guidance only and does not create an FC deposit record until Finance Coordinator saves the record below.
            </span>
          </div>
        )}

        {escrowNotes && (
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Curator/Creator notes
            </p>
            <p className="text-sm whitespace-pre-line">{escrowNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecommendedEscrowCard;
