/**
 * SlaOrderingBar — Visual T1 → T2 → T3 bar for SLA thresholds.
 */

interface SlaOrderingBarProps {
  t1: number;
  t2: number;
  t3: number;
}

export function SlaOrderingBar({ t1, t2, t3 }: SlaOrderingBarProps) {
  const max = Math.max(t3, 200);
  const isValid = t1 < t2 && t2 < t3;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
        <span>SLA Progression:</span>
        <span className={isValid ? 'text-green-600' : 'text-destructive'}>
          {isValid ? '✓ Valid ordering' : '✗ Invalid — T1 < T2 < T3 required'}
        </span>
      </div>
      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-yellow-400/60 rounded-l-full"
          style={{ width: `${(t1 / max) * 100}%` }}
        />
        <div
          className="absolute h-full bg-orange-400/60"
          style={{ left: `${(t1 / max) * 100}%`, width: `${((t2 - t1) / max) * 100}%` }}
        />
        <div
          className="absolute h-full bg-destructive/50"
          style={{ left: `${(t2 / max) * 100}%`, width: `${((t3 - t2) / max) * 100}%` }}
        />
        {/* Markers */}
        <div className="absolute top-0 h-full flex items-center text-[9px] font-bold"
          style={{ left: `${(t1 / max) * 100}%`, transform: 'translateX(-50%)' }}>
          <span className="bg-yellow-500 text-white px-1 rounded">{t1}%</span>
        </div>
        <div className="absolute top-0 h-full flex items-center text-[9px] font-bold"
          style={{ left: `${(t2 / max) * 100}%`, transform: 'translateX(-50%)' }}>
          <span className="bg-orange-500 text-white px-1 rounded">{t2}%</span>
        </div>
        <div className="absolute top-0 h-full flex items-center text-[9px] font-bold"
          style={{ left: `${(t3 / max) * 100}%`, transform: 'translateX(-50%)' }}>
          <span className="bg-destructive text-destructive-foreground px-1 rounded">{t3}%</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>T1 Warning</span>
        <span>T2 Breach</span>
        <span>T3 Critical</span>
      </div>
    </div>
  );
}
