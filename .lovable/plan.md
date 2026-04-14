

# Findings: Re-analyse Flow, Review/Re-review Behavior

## 1. Re-analyse Button — Sequence is Correct in Code

The "Re-analyse Challenge" button (`CurationRightRail.tsx` line 107) correctly calls `handleAnalyse`, which follows this exact sequence:

```text
Re-analyse Challenge (handleAnalyse)
  ├── Pre-flight check
  ├── Pass 1 analysis (waves 1-6) — comments only, NO suggestions
  ├── Wave 7: Context Discovery (discover-context-resources)
  ├── Set pass1DoneSession = true
  ├── Toast: "Review discovered sources in the Context Library"
  └── Auto-open Context Library panel

Generate Suggestions (handleGenerateSuggestions) — separate button
  ├── Regenerate context digest from accepted sources
  ├── Pass 2 only — generates suggestions grounded in digest
  └── Set generateDoneSession = true
```

**The sequence Analyse → Context Library → Generate is enforced.** "Generate Suggestions" is disabled until `contextLibraryReviewed` is true. If you saw suggestions appearing after clicking Re-analyse, that is likely residual suggestions from a previous Generate run still displayed in the UI — not new ones being produced. **Pass 1 explicitly does NOT produce suggestions** (the prompt says: "Do NOT include a suggestion field").

**If suggestions ARE appearing fresh after Re-analyse**, that would be a bug. I can add a step to `handleAnalyse` that clears all existing suggestions from the store before running Pass 1, so stale Pass 2 data doesn't persist.

---

## 2. Individual Section Review vs Re-review — What They Do Today

Both `review()` and `reReview()` in `useAiSectionReview.ts` call the **same** `reviewSingle()` function. They are functionally identical — there is no difference between them.

What `reviewSingle` does:
- Calls the edge function with `wave_action: 'review'`
- The edge function returns **both** `comments` (analysis) AND `suggestion` (rewritten content)
- The hook stores both in the Zustand store via `setAiReview(sectionKey, comments, suggestion)`

**This is different from the global Analyse flow.** The global Analyse (Pass 1) explicitly blocks suggestions. But individual section review/re-review runs a combined pass that returns both comments AND a suggestion in one call.

---

## 3. Confirmation: Review/Re-review Produce Suggestions, Not Just Comments

**Confirmed.** Individual section review and re-review produce:
- **Comments** — analysis observations (errors, warnings, suggestions, best practices, strengths)
- **Suggestion** — AI-recommended replacement content for that section

This is by design. The two-pass separation (Analyse-only → Generate-only) applies only to the **global** workflow. Individual per-section reviews combine both passes into a single call for convenience.

---

## Proposed Fix (if approved)

If Re-analyse is incorrectly showing stale suggestions, I will:

1. **Clear existing suggestions from Zustand store** at the start of `handleAnalyse` — so stale Pass 2 data is wiped before Pass 1 runs
2. **No other changes needed** — the button wiring and sequence gating are correct

This is a 1-file change in `useCurationAIActions.ts` (~3 lines added to `handleAnalyse`).

