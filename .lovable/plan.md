

## Analysis: Principal-Grade Comment Enforcement — Is It Required?

### Short answer

**Conditionally yes — but not exactly as proposed.** The diagnosis is correct (4 forcing fields are optional → schema doesn't force), the conditional-by-type logic is sound, but the implementation as written has architectural issues that conflict with our codebase. With three modifications it becomes a clean fit.

---

### Verifying the diagnosis

I need to confirm the claim before evaluating the fix. Reading:

1. The actual Pass 1 tool schema in the edge function
2. The `AiComment` type in `src/types/sections.ts` (already shown above — confirms the 4 Principal fields are optional/nullable)
3. Where comments are normalised after parsing
4. The `ReviewCommentList` UI to see if a `_principal_grade` badge would even surface

**What I already know from context:**
- `src/types/sections.ts` line 76+ defines `quantification`, `framework_applied`, `evidence_source`, `cross_reference_verified` as **nullable, backward-compatible**. So the schema-level optionality matches the type contract.
- `ReviewCommentList.tsx` already renders a `PrincipalEvidenceFooter` (line 113+) that shows pills for whichever Principal fields are present and renders nothing when none are. So the UI is already type-aware.
- Memory `mem://cogniblend/ai/curator-review-methodology-refinement` is the governing rule: Pass 1 = Analyse only. Adding telemetry-only enforcement does NOT violate it.

---

### Architectural fit assessment

| Aspect | Proposal | Verdict |
|---|---|---|
| Diagnosis (optional fields don't force) | ✅ Correct | Required gap |
| Conditional-by-type (skip strength/best_practice) | ✅ Correct logic | Aligns with how `COMMENT_TYPE_CONFIG` already classifies |
| `_principal_grade` flag on each comment | ⚠️ Underscore-prefix field | Violates our `AiComment` type — needs to be a typed field, not a magic key |
| Telemetry-only (no retry/block) | ✅ Correct phasing | Matches our "ship telemetry first" pattern (e.g. `challenge_quality_telemetry`) |
| `console.log` for telemetry | ❌ Violates R9 (no `console.*`) | Must use `logInfo` or persist to `challenge_quality_telemetry` |
| Frontend badge | ⚠️ Speculative | Not needed in this phase — telemetry first |

### Business need check

**Yes — there is a real business need.** Three signals from project memory:

1. `mem://cogniblend/ai/intelligence-and-quality-framework` — the AI Intelligence layer exists specifically to ground reviews; if half the substantive comments cite no framework or evidence, that grounding is invisible.
2. `mem://cogniblend/ai/curator-review-methodology-refinement` — Pass 1 is "Analyse" with strict separation. A Junior-grade comment masquerading as Principal undermines the curator's trust in Pass 1 output.
3. We just built `challenge_quality_telemetry` and `useChallengeTelemetry` to track quality trends. A `principal_compliance_pct` column slots in naturally.

### What I'd change vs. the proposal

1. **Replace `_principal_grade` magic key with a typed optional field** on `AiComment`: `principal_grade?: 'principal' | 'junior' | null`. Backward compatible (null/undefined = unknown, like the existing fields).
2. **Replace `console.log` with `logInfo`** (R9 rule — zero `console.*` allowed) AND persist `principal_compliance_pct` to `challenge_quality_telemetry` so it's queryable, not just log-grep-able.
3. **Keep the schema as-is** (do NOT add to `required`) — proposal already says this and it's correct.
4. **Defer the frontend badge** — current `PrincipalEvidenceFooter` already implicitly shows grade (more pills = higher grade). Add an explicit badge later only if curators ask for it.

---

### Phased plan (4 phases, all surgical)

| Phase | File | Change | Lines |
|---|---|---|---|
| **0 — Read & confirm** (this approval covers it) | `aiPass1.ts`, the comment-mapping site, `challenge_quality_telemetry` schema | Confirm exact insertion point and column availability | 0 |
| **1 — Type + enforcement** | `src/types/sections.ts` | Add `principal_grade?: 'principal' \| 'junior' \| null` to `AiComment` | +1 |
| **2 — Edge-function enforcement** | `supabase/functions/review-challenge-sections/aiPass1.ts` (or wherever sections are assembled post-parse) | Add the conditional check; set `principal_grade` per comment; compute `principal_compliance_pct` | +25 |
| **3 — Telemetry persistence** | Same edge function, plus optional migration | Persist `principal_compliance_pct` either as a new column on `challenge_quality_telemetry` (preferred — needs migration) OR in a JSON `metrics` field if one exists | +5 (no migration if JSON) / +10 (with migration) |

### Open questions

Before approving, one clarification:

**Q:** Do you want this telemetry persisted to the database (queryable trend in `useChallengeTelemetry`) or is structured logging via `logInfo` sufficient for now?

- **DB column** (preferred): adds `principal_compliance_pct INTEGER` to `challenge_quality_telemetry` — needs a migration but lights up the existing telemetry dashboard.
- **Logs only**: zero schema change, faster to ship, but invisible in the admin Quality Telemetry page.

If you skip this question and approve as-is, I'll go with **DB column** (richer, fits the existing telemetry pattern).

### Risk

- **Zero behavioural change** for users — comments still render exactly as today; the `principal_grade` field is metadata only.
- **Zero change to the schema sent to the model** — required array stays the same, so no impact on completion rates or token cost.
- **Backward compatible** — old reviews without `principal_grade` simply read as `undefined`.
- **No edge-function bundle bloat** — ~25 lines, no new imports.

### Recommendation

**Proceed with the modified version.** It addresses a real quality-measurement gap, fits our telemetry pattern, respects R9 (no `console.*`), and stays type-safe. Skip the speculative frontend badge and the per-comment retry — both can be layered on later if telemetry shows compliance < 70%.

