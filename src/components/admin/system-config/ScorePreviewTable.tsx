/**
 * ScorePreviewTable — Client-side ranking preview for domain weight tuning (SCR-07-02).
 */

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface AdminProfile {
  id: string;
  full_name: string;
  expertise_industry_ids: string[] | null;
  expertise_country_ids: string[] | null;
  expertise_org_type_ids: string[] | null;
}

interface ScorePreviewTableProps {
  admins: AdminProfile[];
  currentWeights: { l1: number; l2: number; l3: number };
  proposedWeights: { l1: number; l2: number; l3: number };
  selectedIndustry: string | null;
  selectedCountry: string | null;
  selectedOrgType: string | null;
}

function computeScore(
  admin: AdminProfile,
  weights: { l1: number; l2: number; l3: number },
  industry: string | null,
  country: string | null,
  orgType: string | null,
) {
  const l1 = industry && admin.expertise_industry_ids?.includes(industry) ? weights.l1 : 0;
  const l2Raw = country && admin.expertise_country_ids?.includes(country) ? weights.l2
    : admin.expertise_country_ids?.includes('*') ? Math.floor(weights.l2 / 2) : 0;
  const l3 = orgType && admin.expertise_org_type_ids?.includes(orgType) ? weights.l3 : 0;
  return { l1, l2: l2Raw, l3, total: l1 + l2Raw + l3 };
}

export function ScorePreviewTable({
  admins,
  currentWeights,
  proposedWeights,
  selectedIndustry,
  selectedCountry,
  selectedOrgType,
}: ScorePreviewTableProps) {
  const ranked = useMemo(() => {
    if (!selectedIndustry && !selectedCountry && !selectedOrgType) return [];

    const currentRanked = admins
      .map((a) => ({ admin: a, ...computeScore(a, currentWeights, selectedIndustry, selectedCountry, selectedOrgType) }))
      .sort((a, b) => b.total - a.total);

    const proposedRanked = admins
      .map((a) => ({ admin: a, ...computeScore(a, proposedWeights, selectedIndustry, selectedCountry, selectedOrgType) }))
      .sort((a, b) => b.total - a.total);

    const currentRankMap = new Map(currentRanked.map((r, i) => [r.admin.id, i + 1]));

    return proposedRanked.map((r, i) => ({
      ...r,
      proposedRank: i + 1,
      currentRank: currentRankMap.get(r.admin.id) ?? 0,
      rankChange: (currentRankMap.get(r.admin.id) ?? 0) - (i + 1),
    }));
  }, [admins, currentWeights, proposedWeights, selectedIndustry, selectedCountry, selectedOrgType]);

  if (ranked.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Select an industry, country, or org type to preview rankings.
      </p>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead className="text-right">L1</TableHead>
            <TableHead className="text-right">L2</TableHead>
            <TableHead className="text-right">L3</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.slice(0, 20).map((r) => (
            <TableRow key={r.admin.id}>
              <TableCell className="font-mono font-bold">{r.proposedRank}</TableCell>
              <TableCell className="text-sm">{r.admin.full_name}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.l1}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.l2}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.l3}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{r.total}</TableCell>
              <TableCell className="text-center">
                {r.rankChange > 0 ? (
                  <Badge variant="default" className="text-xs gap-0.5 bg-green-600">
                    <ArrowUp className="h-3 w-3" />+{r.rankChange}
                  </Badge>
                ) : r.rankChange < 0 ? (
                  <Badge variant="destructive" className="text-xs gap-0.5">
                    <ArrowDown className="h-3 w-3" />{r.rankChange}
                  </Badge>
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
