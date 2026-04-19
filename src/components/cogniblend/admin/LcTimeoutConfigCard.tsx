/**
 * LcTimeoutConfigCard — Standalone admin card for setting the LC review
 * timeout (in business days). Purely presentational: receives the current
 * value, mode, saving state, and save handler from the parent.
 */

import { useEffect, useState } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const MIN_DAYS = 1;
const MAX_DAYS = 30;

interface LcTimeoutConfigCardProps {
  governanceMode: 'STRUCTURED' | 'CONTROLLED';
  currentTimeoutDays: number;
  onSave: (days: number) => void;
  isSaving: boolean;
}

export function LcTimeoutConfigCard({
  governanceMode,
  currentTimeoutDays,
  onSave,
  isSaving,
}: LcTimeoutConfigCardProps) {
  const [draft, setDraft] = useState<number>(currentTimeoutDays);

  useEffect(() => {
    setDraft(currentTimeoutDays);
  }, [currentTimeoutDays]);

  const isInvalid =
    !Number.isFinite(draft) || draft < MIN_DAYS || draft > MAX_DAYS;
  const isUnchanged = draft === currentTimeoutDays;

  const handleSave = () => {
    if (isInvalid || isUnchanged) return;
    onSave(Math.round(draft));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              LC Review Timeout
            </CardTitle>
            <CardDescription>
              How long the Legal Coordinator has to complete their review
              before an escalation notification is sent to the Curator.
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            Applies to: {governanceMode}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="lc-timeout-days">Timeout (business days)</Label>
            <Input
              id="lc-timeout-days"
              type="number"
              inputMode="numeric"
              min={MIN_DAYS}
              max={MAX_DAYS}
              value={Number.isFinite(draft) ? draft : ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft(Number.isNaN(v) ? 0 : v);
              }}
              className="max-w-[140px]"
              disabled={isSaving}
              aria-invalid={isInvalid}
            />
            {isInvalid ? (
              <p className="text-xs text-destructive">
                Enter a value between {MIN_DAYS} and {MAX_DAYS}.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium text-foreground">{currentTimeoutDays}</span> business days
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isInvalid || isUnchanged || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
