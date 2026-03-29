/**
 * PrizeTierEditor — Full inline-editable prize tier table with add/delete/reorder.
 * Replaces the simpler PrizeTierCard approach with a flexible tier system.
 */

import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, GripVertical, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChallengePrizeTier } from '@/hooks/queries/useChallengePrizeTiers';

interface PrizeTierEditorProps {
  tiers: ChallengePrizeTier[];
  totalPool: number;
  currencySymbol: string;
  disabled?: boolean;
  onAddTier: () => void;
  onUpdateTier: (id: string, updates: Partial<ChallengePrizeTier>) => void;
  onDeleteTier: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

export default function PrizeTierEditor({
  tiers,
  totalPool,
  currencySymbol,
  disabled = false,
  onAddTier,
  onUpdateTier,
  onDeleteTier,
  onReorder,
}: PrizeTierEditorProps) {
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.rank - b.rank), [tiers]);

  const totalPercentage = useMemo(
    () => sortedTiers.reduce((sum, t) => sum + Number(t.percentage_of_pool), 0),
    [sortedTiers],
  );

  const allocatedAmount = useMemo(
    () => totalPool > 0 ? Math.round(totalPool * totalPercentage / 100) : 0,
    [totalPool, totalPercentage],
  );

  const remainingAmount = totalPool - allocatedAmount;
  const remainingPercentage = 100 - totalPercentage;

  const topTier = sortedTiers[0];
  const topTierWarning = topTier && Number(topTier.percentage_of_pool) < 40;
  const overBudget = totalPercentage > 100;

  return (
    <div className="space-y-3">
      {/* Warnings */}
      {topTierWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700">
            Top tier ({topTier.tier_name}) is below 40% — may reduce incentive for top solvers.
          </span>
        </div>
      )}

      {overBudget && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive">
            Total allocation ({totalPercentage.toFixed(1)}%) exceeds 100%.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="relative w-full overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8" />
              <TableHead className="min-w-[140px]">Tier Name</TableHead>
              <TableHead className="w-[90px] text-right">% of Pool</TableHead>
              <TableHead className="w-[120px] text-right">Amount ({currencySymbol})</TableHead>
              <TableHead className="w-[80px] text-right">Winners</TableHead>
              <TableHead className="min-w-[180px]">Description</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTiers.map((tier, idx) => {
              const tierAmount = tier.fixed_amount != null
                ? tier.fixed_amount
                : totalPool > 0
                  ? Math.round(totalPool * Number(tier.percentage_of_pool) / 100)
                  : 0;

              return (
                <TableRow key={tier.id} className={cn(overBudget && 'bg-destructive/5')}>
                  {/* Reorder */}
                  <TableCell className="px-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={disabled || idx === 0}
                        onClick={() => onReorder(tier.id, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={disabled || idx === sortedTiers.length - 1}
                        onClick={() => onReorder(tier.id, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* Tier Name */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {disabled ? (
                        <span className="text-sm font-medium">{tier.tier_name}</span>
                      ) : (
                        <Input
                          value={tier.tier_name}
                          onChange={(e) => onUpdateTier(tier.id, { tier_name: e.target.value })}
                          className="h-7 text-sm border-0 border-b border-border rounded-none bg-transparent px-1"
                        />
                      )}
                      {tier.is_default && (
                        <Badge variant="outline" className="text-[9px] shrink-0">Default</Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* % of Pool */}
                  <TableCell className="text-right">
                    {disabled ? (
                      <span className="text-sm tabular-nums">{Number(tier.percentage_of_pool)}%</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={tier.percentage_of_pool}
                        onChange={(e) => onUpdateTier(tier.id, { percentage_of_pool: Number(e.target.value) || 0 })}
                        className="h-7 w-16 text-sm text-right border-0 border-b border-border rounded-none bg-transparent px-1 ml-auto"
                      />
                    )}
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="text-right">
                    <span className="text-sm tabular-nums font-medium">
                      {currencySymbol}{tierAmount.toLocaleString()}
                    </span>
                  </TableCell>

                  {/* Max Winners */}
                  <TableCell className="text-right">
                    {disabled ? (
                      <span className="text-sm tabular-nums">{tier.max_winners}</span>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={tier.max_winners}
                        onChange={(e) => onUpdateTier(tier.id, { max_winners: Math.max(1, Number(e.target.value) || 1) })}
                        className="h-7 w-14 text-sm text-right border-0 border-b border-border rounded-none bg-transparent px-1 ml-auto"
                      />
                    )}
                  </TableCell>

                  {/* Description */}
                  <TableCell>
                    {disabled ? (
                      <span className="text-xs text-muted-foreground line-clamp-2">{tier.description ?? '—'}</span>
                    ) : (
                      <Input
                        value={tier.description ?? ''}
                        onChange={(e) => onUpdateTier(tier.id, { description: e.target.value })}
                        placeholder="Brief description"
                        className="h-7 text-xs border-0 border-b border-border rounded-none bg-transparent px-1"
                      />
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {!disabled && sortedTiers.length > 1 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteTier(tier.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete tier</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell />
              <TableCell className="text-sm font-semibold">Total</TableCell>
              <TableCell className={cn('text-right text-sm font-semibold tabular-nums', overBudget && 'text-destructive')}>
                {totalPercentage.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {currencySymbol}{allocatedAmount.toLocaleString()}
              </TableCell>
              <TableCell />
              <TableCell colSpan={2} className="text-xs text-muted-foreground">
                {remainingPercentage > 0 && totalPool > 0
                  ? `Remaining: ${currencySymbol}${remainingAmount.toLocaleString()} (${remainingPercentage.toFixed(1)}%)`
                  : remainingPercentage === 0
                    ? '✓ Fully allocated'
                    : ''}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Add Tier button */}
      {!disabled && (
        <Button variant="outline" size="sm" onClick={onAddTier} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Tier
        </Button>
      )}
    </div>
  );
}
