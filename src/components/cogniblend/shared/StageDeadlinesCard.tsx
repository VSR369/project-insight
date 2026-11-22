/**
 * StageDeadlinesCard — stage choice (DEF-0157) and UTC deadlines (DEF-0036).
 * The server refuses invalid schedules; this card explains problems first.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStageDeadlines, useSaveStageDeadlines } from '@/hooks/queries/useStageDeadlines';
import { useConfigNumber } from '@/hooks/queries/useMpaConfig';
import {
  resolveStageCount, canChooseStageCount, validateDeadlines, formatDeadline,
  toUtcInput, fromUtcInput, type StageGovernanceMode,
} from '@/services/cogniblend/lifecycle/stageDeadlines';

const schema = z.object({
  stageCount: z.enum(['1', '2']),
  startAt: z.string(),
  abstractDeadline: z.string(),
  solutionDeadline: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface StageDeadlinesCardProps {
  challengeId?: string;
  governanceMode: StageGovernanceMode;
}

export function StageDeadlinesCard({ challengeId, governanceMode }: StageDeadlinesCardProps) {
  const minOpenDays = useConfigNumber('challenge_min_open_period_days');
  const abstractMinOpenDays = useConfigNumber('abstract_min_open_period_days');
  const solutionMinOpenDays = useConfigNumber('solution_min_open_period_days');
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stageCount: '1', startAt: '', abstractDeadline: '', solutionDeadline: '' },
  });
  const { data, isLoading, isError, refetch } = useStageDeadlines(challengeId);
  const save = useSaveStageDeadlines(challengeId);
  useEffect(() => {
    if (!data) return;
    form.reset({
      stageCount: String(data.stageCount) as '1' | '2',
      startAt: toUtcInput(data.startAt),
      abstractDeadline: toUtcInput(data.abstractDeadline),
      solutionDeadline: toUtcInput(data.solutionDeadline),
    });
  }, [data, form]);

  if (!challengeId) return <p className="text-xs text-muted-foreground">Save a draft to set stages and deadlines.</p>;
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data) {
    return (
      <div className="text-xs text-destructive space-y-2">
        <p>Could not load stages and deadlines.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const values = form.watch();
  const chosen = values.stageCount === '2' ? 2 : 1;
  const stageCount = resolveStageCount(governanceMode, chosen);
  const isLocked = data.isPublished;
  const schedule = {
    stageCount,
    startAt: fromUtcInput(values.startAt),
    abstractDeadline: fromUtcInput(values.abstractDeadline),
    solutionDeadline: fromUtcInput(values.solutionDeadline),
  };
  const problems = validateDeadlines(schedule, { minOpenDays, abstractMinOpenDays, solutionMinOpenDays });
  const handleSubmit = form.handleSubmit(() => save.mutate(schedule));
  const dateField = (name: 'startAt' | 'abstractDeadline' | 'solutionDeadline', label: string) => {
    const value = fromUtcInput(values[name]);
    return (
      <div className="space-y-1">
        <Label htmlFor={`sd-${name}`}>{label} (UTC)</Label>
        <Input id={`sd-${name}`} type="datetime-local" className="text-base" disabled={isLocked} {...form.register(name)} />
        {value && <p className="text-xs text-muted-foreground">{formatDeadline(value)}</p>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4" />Stages and deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2" disabled={!canChooseStageCount(governanceMode, isLocked)}>
            <legend className="text-sm font-medium">Stages</legend>
            {(['1', '2'] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm min-h-11">
                <input type="radio" value={v} checked={String(stageCount) === v} {...form.register('stageCount')} />
                {v === '1' ? 'Single-stage (full solutions only)' : 'Two-stage (abstracts, then shortlisted full solutions)'}
              </label>
            ))}
            {governanceMode !== 'STRUCTURED' && (
              <p className="text-xs text-muted-foreground">{governanceMode === 'QUICK' ? 'Express is always single-stage.' : 'High-Rigor is always two-stage.'}</p>
            )}
          </fieldset>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {dateField('startAt', 'Start')}
            {stageCount === 2 && dateField('abstractDeadline', 'Abstract deadline')}
            {dateField('solutionDeadline', 'Solution deadline')}
          </div>
          {problems.length > 0 && (
            <ul role="alert" className="text-xs text-destructive list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
          {isLocked ? (
            <p className="text-xs text-muted-foreground">Published: only the Curator can extend deadlines, with a written reason.</p>
          ) : (
            <Button type="submit" size="sm" disabled={save.isPending || problems.length > 0}>
              {save.isPending ? 'Saving…' : 'Save stages and deadlines'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
