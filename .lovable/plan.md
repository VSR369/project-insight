

# Fix: Update "AI Content Drafted" Label to Include Suggestions Status

## Problem
When Pass 2 succeeds on a section where it generated content (action `'generate'`), the label shows **"AI Content Drafted"** but doesn't indicate whether suggestions were also generated. Since a successful Pass 2 execution always produces suggestions alongside drafted content, the label should reflect both.

## Change

**File:** `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx`

Line 149 — change:
```ts
if (execSection.action === 'generate') return 'AI Content Drafted';
```
to:
```ts
if (execSection.action === 'generate') return 'AI Content Drafted & Suggestions Generated';
```

One line, one file. The success status already confirms suggestions were generated, so no additional condition is needed.

