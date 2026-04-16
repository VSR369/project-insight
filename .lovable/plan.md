

# Fix: Pass 2 Must Process AI-Drafted Sections + Correct Status Labels

## Problem

In Pass 2, sections where Pass 1 generated content (because the creator left them empty) are currently treated correctly at the execution level — `determineSectionAction` sees the stored content and returns `'review'`, so the edge function runs with `wave_action: 'review'`.

However, the **diagnostics label** shows "Suggestion Generated" for these sections, which is misleading. The user wants to clearly distinguish sections where the original content was AI-drafted (Pass 1) from sections where the creator provided content.

The fix is purely in the diagnostics panel label logic — Pass 2 execution already processes these sections correctly.

## Approach

Cross-reference the Pass 1 execution record to determine which sections had `action === 'generate'` (meaning AI drafted the content). In Pass 2's diagnostics panel, use that to show:

- **"AI Drafted & Suggestions Generated"** — section was empty, Pass 1 generated content, Pass 2 then reviewed it and produced suggestions
- **"Suggestion Generated"** — section had creator content, Pass 2 reviewed and produced suggestions

## Changes

| File | Change |
|------|--------|
| `DiagnosticsSuggestionsPanel.tsx` | Accept `analyseRecord` as an additional prop. For each section with `status === 'success'`, check if the Pass 1 record shows `action === 'generate'` for that section. If yes → label "AI Drafted & Suggestions Generated". If no → label "Suggestion Generated". |
| `DiagnosticsSheet.tsx` | Pass `analyseRecord` to `DiagnosticsSuggestionsPanel` |
| `CurationDiagnosticsPage.tsx` | Pass `analyseRecord` to `DiagnosticsSuggestionsPanel` |

## Updated Pass 2 Status Labels

| Scenario | Label |
|----------|-------|
| Success, section was AI-drafted in Pass 1 | **"AI Drafted & Suggestions Generated"** |
| Success, section had creator content | **"Suggestion Generated"** |
| Error | "Error" |
| Skipped | "Skipped" |
| Not executed | "Not Run" |

## Technical Detail

The `DiagnosticsSuggestionsPanel` will receive both `executionRecord` (Pass 2) and `analyseRecord` (Pass 1). For each section, it builds a lookup set of section IDs where Pass 1 action was `'generate'`, then uses that set in the label logic. No changes to execution flow or edge functions — this is a display-only fix.

