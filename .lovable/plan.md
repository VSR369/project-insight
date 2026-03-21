## Plan: Fix LC Legal Workspace — Submit, Generate, and Save Issues

**Status: ✅ IMPLEMENTED**

### Changes Applied

1. **Hide "Generate" when AI suggestions exist** — Only shown when no `ai_suggested` docs in DB
2. **GATE-02 failure banners with inline fixes** — Maturity level dropdown + pending doc count warnings
3. **Direct phase update** — Replaced `complete_phase` RPC with direct `challenges` table update to Phase 3
4. **Save Content button** — Added "Save Edits" on AI suggestion cards for incremental content persistence
5. **Pending doc count warning** — Alert shown near Submit when AI suggestions still need Accept/Dismiss

### Files Modified
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx`
