/**
 * WeightSliders — L1/L2/L3 domain match weight sliders for SCR-07-02.
 */

import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, RotateCcw } from 'lucide-react';

interface WeightSlidersProps {
  l1: number;
  l2: number;
  l3: number;
  onL1Change: (v: number) => void;
  onL2Change: (v: number) => void;
  onL3Change: (v: number) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  isSaving: boolean;
}

export function WeightSliders({
  l1, l2, l3,
  onL1Change, onL2Change, onL3Change,
  reason, onReasonChange,
  onSave, onCancel, onReset,
  isSaving,
}: WeightSlidersProps) {
  const sum = l1 + l2 + l3;
  const isValid = sum === 100;

  return (
    <div className="space-y-6">
      {/* L1 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">L1 — Industry Match</span>
          <Badge variant={l1 > 0 ? 'default' : 'secondary'} className="font-mono">{l1}%</Badge>
        </div>
        <Slider value={[l1]} min={0} max={100} step={5} onValueChange={([v]) => onL1Change(v)} />
      </div>

      {/* L2 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">L2 — Country Match</span>
          <Badge variant={l2 > 0 ? 'default' : 'secondary'} className="font-mono">{l2}%</Badge>
        </div>
        <Slider value={[l2]} min={0} max={100} step={5} onValueChange={([v]) => onL2Change(v)} />
      </div>

      {/* L3 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">L3 — Org Type Match</span>
          <Badge variant={l3 > 0 ? 'default' : 'secondary'} className="font-mono">{l3}%</Badge>
        </div>
        <Slider value={[l3]} min={0} max={100} step={5} onValueChange={([v]) => onL3Change(v)} />
      </div>

      {/* Sum indicator */}
      <div className={`text-center text-sm font-mono p-2 rounded-md ${isValid ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-destructive/10 text-destructive'}`}>
        {l1} + {l2} + {l3} = {sum} {isValid ? '✓' : `(must equal 100)`}
      </div>

      {/* Reset */}
      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onReset}>
        <RotateCcw className="h-3 w-3 mr-1" />
        Reset to defaults (50 / 30 / 20)
      </Button>

      {/* Reason */}
      <Textarea
        placeholder="Change reason (optional)"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        className="text-sm h-16 resize-none"
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={!isValid || isSaving}>
          <Check className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save Weights'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
