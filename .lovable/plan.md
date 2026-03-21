

## Plan: Fix LC Legal Workspace — Submit, Generate, and Save Issues

### Issues Identified (from GATE-02 response and UI)

The "Submit to Curation" click triggers `validate_gate_02` which returns:
```
{"passed": false, "failures": ["Maturity level is not set", "3 legal doc(s) pending Legal Coordinator approval"]}
```

Three distinct problems:

1. **GATE-02 blocks on maturity_level = null** — Challenge was created without maturity level being set (it's still `null` in DB). LC workspace has no way to fix this.
2. **3 AI-suggested docs count as "pending"** — GATE-02 counts `ai_suggested` docs with `lc_status = null` as unprocessed. LC must Accept or Dismiss all before submitting.
3. **"Generate Legal Documents" button always visible** — Shows even when AI suggestions already exist in DB, confusing the LC.
4. **Submit uses `complete_phase` RPC** — Same permission bug that failed in AISpecReviewPage. Needs direct phase update.
5. **No explicit "Save" for edited content** — LC can edit AI doc content in textarea but changes only persist on "Accept & Attach". No standalone save.

### Fix

**File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**

1. **Hide "Generate" when suggestions exist**: Change condition on line 908 to also check `!hasSuggestions` — only show Generate when no AI suggestions are in DB. Relabel to "Regenerate" if docs were already accepted.

2. **Show actionable GATE-02 failure banners**: Before the Submit button, display each GATE-02 failure as an alert with a fix action:
   - "Maturity level is not set" → Show inline dropdown for LC to set maturity level directly (update challenges table)
   - "N docs pending approval" → List unapproved docs with links to scroll to them

3. **Replace `complete_phase` RPC with direct update**: Same pattern as AISpecReviewPage fix — after GATE-02 passes, directly update `challenges` table:
   ```ts
   await supabase.from('challenges').update({
     current_phase: 3,
     phase_status: 'ACTIVE',
     updated_by: user.id,
     updated_at: new Date().toISOString(),
   }).eq('id', challengeId);
   ```

4. **Add "Save Content" button** on AI suggestion cards: Next to "Accept & Attach", add a "Save Edits" button that updates `content_summary` on the existing `challenge_legal_docs` row without changing status. This lets LC iteratively edit before final acceptance.

5. **Show pending doc count warning** near Submit button: Display how many AI suggestions still need Accept/Dismiss, so LC knows what's blocking submission.

### What This Fixes
- Submit to Curation advances challenge to Phase 3 (Curation Queue) without RPC permission errors
- LC can fix maturity_level gap directly from the workspace
- "Generate" button hidden when docs already generated — no confusion
- LC can save content edits incrementally before final acceptance
- Curator will see the challenge in their queue with all legal docs attached

### Files Modified
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

