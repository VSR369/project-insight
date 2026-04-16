/**
 * waveExecutionHistory — Authoritative persisted record of wave execution.
 * Stored per challenge + pass in localStorage.
 * Single source of truth for diagnostics and recovery UI.
 */

import type { SectionKey } from '@/types/sections';
import type { SectionAction } from '@/lib/cogniblend/waveConfig';

export type PassType = 'analyse' | 'generate';
export type WaveRunStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled';

export interface WaveSectionResult {
  sectionId: SectionKey;
  action: SectionAction;
  status: 'success' | 'error' | 'skipped';
}

export interface WaveRunRecord {
  waveNumber: number;
  name: string;
  status: WaveRunStatus;
  sections: WaveSectionResult[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface ExecutionRecord {
  challengeId: string;
  passType: PassType;
  overallStatus: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
  waves: WaveRunRecord[];
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  lastCompletedWave: number;
}

export type ExecutionOutcome = 'completed' | 'cancelled' | 'error';

export interface ExecutionResult {
  outcome: ExecutionOutcome;
  lastCompletedWave: number;
  totalWaves: number;
  errorMessage: string | null;
  failedSections: SectionKey[];
}

/* ── Acceptance tracking (Pass 3) ── */

export interface AcceptanceSectionResult {
  sectionId: SectionKey;
  status: 'updated' | 'failed';
  errorMessage?: string;
}

export interface AcceptanceRecord {
  challengeId: string;
  overallStatus: 'completed' | 'partial' | 'failed';
  sections: AcceptanceSectionResult[];
  acceptedAt: string;
  totalUpdated: number;
  totalFailed: number;
}

function acceptanceKey(challengeId: string): string {
  return `wave-accept-${challengeId}`;
}

export function loadAcceptanceRecord(challengeId: string): AcceptanceRecord | null {
  try {
    const raw = localStorage.getItem(acceptanceKey(challengeId));
    if (!raw) return null;
    return JSON.parse(raw) as AcceptanceRecord;
  } catch {
    return null;
  }
}

export function saveAcceptanceRecord(record: AcceptanceRecord): void {
  try {
    localStorage.setItem(acceptanceKey(record.challengeId), JSON.stringify(record));
  } catch { /* localStorage unavailable */ }
}

function storageKey(challengeId: string, passType: PassType): string {
  return `wave-exec-${challengeId}-${passType}`;
}

export function loadExecutionRecord(
  challengeId: string,
  passType: PassType,
): ExecutionRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(challengeId, passType));
    if (!raw) return null;
    return JSON.parse(raw) as ExecutionRecord;
  } catch {
    return null;
  }
}

export function saveExecutionRecord(record: ExecutionRecord): void {
  try {
    localStorage.setItem(
      storageKey(record.challengeId, record.passType),
      JSON.stringify(record),
    );
  } catch { /* localStorage unavailable */ }
}

export function createFreshRecord(
  challengeId: string,
  passType: PassType,
  waves: Array<{ waveNumber: number; name: string; sectionIds: SectionKey[] }>,
): ExecutionRecord {
  return {
    challengeId,
    passType,
    overallStatus: 'running',
    waves: waves.map((w) => ({
      waveNumber: w.waveNumber,
      name: w.name,
      status: 'pending',
      sections: w.sectionIds.map((id) => ({
        sectionId: id,
        action: 'review' as SectionAction,
        status: 'skipped' as const,
      })),
      startedAt: null,
      completedAt: null,
    })),
    startedAt: new Date().toISOString(),
    completedAt: null,
    failedAt: null,
    errorMessage: null,
    lastCompletedWave: 0,
  };
}

export function updateWaveStart(record: ExecutionRecord, waveNumber: number): ExecutionRecord {
  return {
    ...record,
    waves: record.waves.map((w) =>
      w.waveNumber === waveNumber
        ? { ...w, status: 'running', startedAt: new Date().toISOString() }
        : w
    ),
  };
}

export function updateWaveComplete(
  record: ExecutionRecord,
  waveNumber: number,
  sections: WaveSectionResult[],
): ExecutionRecord {
  const hasErrors = sections.some((s) => s.status === 'error');
  return {
    ...record,
    lastCompletedWave: waveNumber,
    waves: record.waves.map((w) =>
      w.waveNumber === waveNumber
        ? {
            ...w,
            status: hasErrors ? 'error' : 'completed',
            sections,
            completedAt: new Date().toISOString(),
          }
        : w
    ),
  };
}

export function finalizeRecord(
  record: ExecutionRecord,
  outcome: ExecutionOutcome,
  errorMessage?: string,
): ExecutionRecord {
  const now = new Date().toISOString();
  return {
    ...record,
    overallStatus: outcome,
    completedAt: outcome === 'completed' ? now : record.completedAt,
    failedAt: outcome === 'error' ? now : record.failedAt,
    errorMessage: errorMessage ?? record.errorMessage,
    waves: record.waves.map((w) =>
      w.status === 'pending' || w.status === 'running'
        ? { ...w, status: outcome === 'cancelled' ? 'cancelled' : w.status }
        : w
    ),
  };
}
