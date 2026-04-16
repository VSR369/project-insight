/**
 * waveTimingFormat — Pure helpers for formatting wave durations.
 */

import type { ExecutionRecord, WaveRunRecord } from '@/services/cogniblend/waveExecutionHistory';

export interface WaveDuration {
  waveNumber: number;
  name: string;
  status: WaveRunRecord['status'];
  durationMs: number | null;
  isLive: boolean;
  sectionsTotal: number;
  sectionsCompleted: number;
}

export interface TimingSummary {
  waves: WaveDuration[];
  totalDurationMs: number;
  totalSectionsCompleted: number;
  totalSections: number;
}

/** Format a duration in ms to a compact human string. */
export function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    // <10s: 1 decimal place; else integer seconds
    return totalSeconds < 10 ? `${totalSeconds.toFixed(1)}s` : `${Math.round(totalSeconds)}s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remSeconds = Math.round(totalSeconds - totalMinutes * 60);
  if (totalMinutes < 60) return `${totalMinutes}m ${remSeconds}s`;
  const hours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes - hours * 60;
  return `${hours}h ${remMinutes}m`;
}

/** Compute per-wave durations + grand totals from an execution record. */
export function computeWaveDurations(record: ExecutionRecord | null | undefined): TimingSummary {
  if (!record || record.waves.length === 0) {
    return { waves: [], totalDurationMs: 0, totalSectionsCompleted: 0, totalSections: 0 };
  }
  const now = Date.now();
  const waves: WaveDuration[] = record.waves.map((w) => {
    const start = w.startedAt ? new Date(w.startedAt).getTime() : null;
    const end = w.completedAt ? new Date(w.completedAt).getTime() : null;
    const isLive = w.status === 'running' && start != null && end == null;
    const durationMs =
      start != null
        ? (end ?? (isLive ? now : null)) != null
          ? ((end ?? now) - start)
          : null
        : null;
    const sectionsCompleted = w.sections.filter((s) => s.status === 'success').length;
    return {
      waveNumber: w.waveNumber,
      name: w.name,
      status: w.status,
      durationMs,
      isLive,
      sectionsTotal: w.sections.length,
      sectionsCompleted,
    };
  });

  const totalDurationMs = waves.reduce((acc, w) => acc + (w.durationMs ?? 0), 0);
  const totalSectionsCompleted = waves.reduce((acc, w) => acc + w.sectionsCompleted, 0);
  const totalSections = waves.reduce((acc, w) => acc + w.sectionsTotal, 0);

  return { waves, totalDurationMs, totalSectionsCompleted, totalSections };
}
