/**
 * LcChallengeDetailsCard — Read-only Accordion view of challenge specification
 * for the LC workspace (Overview, Deliverables, Evaluation, IP/Governance,
 * Reward, Solver eligibility).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Eye } from 'lucide-react';
import { resolveGovernanceMode, GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';
import { getMaturityLabel } from '@/lib/maturityLabels';
import {
  IP_MODEL_LABELS,
  parseRewardStructure,
  renderEvalCriteria,
  renderJsonList,
} from '@/lib/cogniblend/lcLegalHelpers';
import type { LcChallenge } from '@/hooks/cogniblend/useLcLegalData';

export interface LcChallengeDetailsCardProps {
  challenge: LcChallenge | null | undefined;
}

export function LcChallengeDetailsCard({ challenge }: LcChallengeDetailsCardProps) {
  const deliverablesList = renderJsonList(challenge?.deliverables);
  const evalCriteria = renderEvalCriteria(challenge?.evaluation_criteria);
  const solverTypes = renderJsonList(challenge?.solver_eligibility_types);
  const solverVisible = renderJsonList(challenge?.solver_visibility_types);
  const reward = parseRewardStructure(challenge?.reward_structure);
  const govMode = resolveGovernanceMode(challenge?.governance_profile ?? undefined);
  const govCfg = GOVERNANCE_MODE_CONFIG[govMode];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Challenge Specification — Read Only
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['overview', 'deliverables', 'evaluation', 'ip', 'solver']}>
          <AccordionItem value="overview">
            <AccordionTrigger className="text-sm font-semibold">Overview</AccordionTrigger>
            <AccordionContent className="space-y-4">
              {challenge?.hook && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Hook</p>
                  <p className="text-sm text-foreground">{challenge.hook}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Problem Statement</p>
                <p className="text-sm text-foreground whitespace-pre-line">{challenge?.problem_statement || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Scope & Constraints</p>
                <p className="text-sm text-foreground whitespace-pre-line">{challenge?.scope || '—'}</p>
              </div>
              {challenge?.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{challenge.description}</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="deliverables">
            <AccordionTrigger className="text-sm font-semibold">Deliverables</AccordionTrigger>
            <AccordionContent>
              {deliverablesList.length > 0 ? (
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground">
                  {deliverablesList.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No deliverables specified.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="evaluation">
            <AccordionTrigger className="text-sm font-semibold">Evaluation Criteria</AccordionTrigger>
            <AccordionContent>
              {evalCriteria.length > 0 ? (
                <div className="relative w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Criterion</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Weight</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evalCriteria.map((c, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{c.name}</td>
                          <td className="py-2 pr-4 tabular-nums">{c.weight}%</td>
                          <td className="py-2 text-muted-foreground">{c.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No evaluation criteria specified.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ip">
            <AccordionTrigger className="text-sm font-semibold">IP Model & Governance</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {challenge?.ip_model && (
                  <Badge variant="outline">IP: {IP_MODEL_LABELS[challenge.ip_model] ?? challenge.ip_model}</Badge>
                )}
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: govCfg.bg, color: govCfg.color }}
                >
                  Governance: {govCfg.label}
                </span>
                <Badge variant="secondary">Maturity: {getMaturityLabel(challenge?.maturity_level)}</Badge>
                {challenge?.operating_model && <Badge variant="secondary">Model: {challenge.operating_model}</Badge>}
                {challenge?.current_phase != null && <Badge variant="outline">Phase: {challenge.current_phase}</Badge>}
                {challenge?.master_status && <Badge variant="outline">Status: {challenge.master_status}</Badge>}
              </div>
              {reward && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reward Structure</p>
                  <div className="flex flex-wrap gap-2">
                    {reward.currency && <Badge variant="outline">Currency: {reward.currency}</Badge>}
                    {reward.paymentMode && <Badge variant="secondary">{reward.paymentMode.replace(/_/g, ' ')}</Badge>}
                    {reward.numRewarded != null && <Badge variant="secondary">{reward.numRewarded} awarded</Badge>}
                    {reward.totalPool != null && <Badge variant="outline">Pool: {reward.totalPool.toLocaleString()}</Badge>}
                  </div>
                  {reward.tiers && reward.tiers.length > 0 && (
                    <div className="relative w-full overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Tier</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reward.tiers.map((t, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{t.label ?? t.name ?? `Tier ${i + 1}`}</td>
                              <td className="py-2 tabular-nums">{(t.amount ?? t.value ?? 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {reward.milestones && reward.milestones.length > 0 && (
                    <div className="relative w-full overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Milestone</th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Trigger</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reward.milestones.map((m, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{m.name ?? m.label ?? `Milestone ${i + 1}`}</td>
                              <td className="py-2 pr-4 text-muted-foreground">{(m.trigger ?? '').replace(/_/g, ' ')}</td>
                              <td className="py-2 tabular-nums">{m.pct ?? m.percentage ?? m.percent ?? 0}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="solver">
            <AccordionTrigger className="text-sm font-semibold">Solution Provider Eligibility & Visibility</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {challenge?.eligibility && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Eligibility</p>
                  <p className="text-sm text-foreground">{challenge.eligibility}</p>
                </div>
              )}
              {solverTypes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Eligible Solution Provider Types</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {solverTypes.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {solverVisible.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Visible Solution Provider Types</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {solverVisible.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default LcChallengeDetailsCard;
