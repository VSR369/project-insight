/**
 * acceptRefinementHelpers — Pure helper functions for section-specific
 * content acceptance, extracted from useCurationAcceptRefinement.
 */

import { toast } from 'sonner';
import { stripCodeFences } from '@/lib/cogniblend/normalizeAIContent';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

interface SaveContext {
  setSavingSection: (v: boolean) => void;
  syncSectionToStore: (key: SectionKey, data: any) => void;
  saveSectionMutation: { mutate: (args: { field: string; value: any }) => void };
}

export function acceptSolverExpertise(
  newContent: string,
  sectionKey: string,
  ctx: SaveContext,
) {
  try {
    const cleaned = stripCodeFences(newContent);
    let parsed: any;
    try { parsed = JSON.parse(cleaned); } catch {
      const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[1]);
    }
    if (!parsed) throw new Error('No valid JSON found');
    if (Array.isArray(parsed)) {
      parsed = {
        expertise_areas: parsed.map((item: any) =>
          typeof item === 'string' ? { area: item, level: 'required' } : item
        ),
      };
    }
    ctx.setSavingSection(true);
    ctx.syncSectionToStore(sectionKey as SectionKey, parsed);
    ctx.saveSectionMutation.mutate({ field: 'solver_expertise_requirements', value: parsed });
  } catch {
    toast.error('AI returned invalid expertise data. Please try re-reviewing.');
  }
}

export function acceptCodeArray(
  newContent: string,
  sectionKey: string,
  dbField: string,
  options: Array<{ value: string; label: string }>,
  ctx: SaveContext,
): boolean {
  try {
    const codes = JSON.parse(newContent);
    if (Array.isArray(codes)) {
      const typed = codes.map((c: string) => ({
        code: c,
        label: options.find(o => o.value === c)?.label ?? c,
      }));
      ctx.setSavingSection(true);
      ctx.syncSectionToStore(sectionKey as SectionKey, typed as unknown as SectionStoreEntry['data']);
      ctx.saveSectionMutation.mutate({ field: dbField, value: typed });
      return true;
    }
  } catch { /* not JSON array */ }
  return false;
}

export function acceptSubmissionGuidelines(
  newContent: string,
  sectionKey: string,
  ctx: SaveContext,
) {
  let items: any[];
  try {
    const cleaned = stripCodeFences(newContent);
    const parsed = JSON.parse(cleaned);
    items = Array.isArray(parsed) ? parsed : (parsed?.items ?? [parsed]);
  } catch {
    items = newContent.split('\n')
      .map(l => l.replace(/^[\d.)\-*•]\s*/, '').trim())
      .filter(l => l.length > 0);
  }
  const structured = items.map((item: any) => {
    if (typeof item === 'string') return { name: item, description: '' };
    return { name: item.name ?? item.title ?? String(item), description: item.description ?? '' };
  });
  ctx.setSavingSection(true);
  const value = { items: structured };
  ctx.syncSectionToStore(sectionKey as SectionKey, value);
  ctx.saveSectionMutation.mutate({ field: 'submission_guidelines', value });
}

export function acceptSolutionType(
  newContent: string,
  solutionTypesData: any[],
  handleSaveSolutionTypes: (codes: string[]) => Promise<void>,
) {
  let codes: string[] = [];
  try {
    const parsed = JSON.parse(newContent);
    codes = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    codes = newContent.split(',').map(s => s.trim()).filter(Boolean);
  }
  const validCodes = new Set(solutionTypesData.map(t => t.code));
  const matched = codes.filter(c => validCodes.has(c));
  if (matched.length === 0) {
    toast.error(`No valid solution type codes found. Valid: ${Array.from(validCodes).join(', ')}`);
    return;
  }
  handleSaveSolutionTypes(matched);
}

export function acceptSingleCode(
  newContent: string,
  sectionKey: string,
  cfg: { field: string; options: Array<{ value: string; label: string }> },
  ctx: SaveContext,
) {
  let code = newContent.trim().replace(/^["']|["']$/g, '');
  try {
    const parsed = JSON.parse(code);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      code = String(parsed.selected_id ?? parsed.code ?? parsed.value ?? code);
    }
  } catch { /* not JSON */ }
  const matched = cfg.options.find(o => o.value.toLowerCase() === code.toLowerCase());
  if (matched) {
    ctx.setSavingSection(true);
    ctx.syncSectionToStore(sectionKey as SectionKey, matched.value);
    ctx.saveSectionMutation.mutate({ field: cfg.field, value: matched.value });
    return;
  }
  const validCodes = new Set(cfg.options.map(o => o.value));
  if (!validCodes.has(code)) {
    toast.error(`Invalid ${sectionKey}: "${code}" is not a valid option. Valid: ${Array.from(validCodes).join(', ')}`);
    return;
  }
  ctx.setSavingSection(true);
  ctx.syncSectionToStore(sectionKey as SectionKey, code);
  ctx.saveSectionMutation.mutate({ field: cfg.field, value: code });
}
