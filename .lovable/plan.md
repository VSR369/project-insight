

## Curator's Guide Modal — First-Visit Instruction Sheet

### What this builds

A professional onboarding modal matching the reference design that:
- Auto-opens **once per challenge** on first curator visit (localStorage key: `curator_guide_seen_{challengeId}`)
- Can be re-opened anytime via a help tooltip/button in the header bar
- Contains 4 sections: Review Flow (3 steps), AI Coverage + Quality (2-column), Time Savings (3 metric cards), Section Dependencies (info strip)
- Two CTAs: "Show again later" (dismisses without setting flag) and "Got it, start reviewing" (sets localStorage flag)

### Content structure (from reference)

1. **Header**: "How Curation Review works" — subtitle about 3-step AI-assisted workflow
2. **The Review Flow**: 3 numbered cards (Analyse challenge → Accept sources → Generate suggestions)
3. **Two-column block**: "What AI reviews cover" (5 bullets) + "Review quality — principal consultant level" (5 bullets explaining breadth, governance, pattern-matching, risk surfacing, structured output)
4. **Time You Get Back**: 3 metric cards (~3 min full review, 3-4 hrs equivalent manual, ~95% faster)
5. **Dependency strip**: Info callout about section order (Core Identity first, downstream sections depend on them)
6. **Footer**: "Show again later" + "Got it, start reviewing →"

### Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/cogniblend/curation/CuratorGuideModal.tsx` | **Create** | The modal component (~200 lines) |
| `src/pages/cogniblend/CurationReviewPage.tsx` | **Modify** | Add state + render the modal, pass challengeId |
| `src/components/cogniblend/curation/CurationHeaderBar.tsx` | **Modify** | Add a small "?" or "Guide" tooltip button that re-opens the modal |

### Technical details

**CuratorGuideModal.tsx** (~200 lines)
- Props: `challengeId: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onDismissForSession: () => void`
- Uses `Dialog` / `DialogContent` with `max-w-3xl max-h-[90vh] overflow-y-auto`
- localStorage key: `curator_guide_seen_${challengeId}` — checked on mount
- "Got it, start reviewing" sets the flag + closes
- "Show again later" just closes (no flag set)

**CurationReviewPage.tsx** (add ~10 lines)
- `const [guideOpen, setGuideOpen] = useState(() => !localStorage.getItem(\`curator_guide_seen_${o.challengeId}\`))` — auto-opens on first visit
- Render `<CuratorGuideModal>` in the modals section
- Pass `setGuideOpen` to `CurationHeaderBar` as `onOpenGuide`

**CurationHeaderBar.tsx** (add ~5 lines)
- Add `onOpenGuide?: () => void` prop
- Render a small `HelpCircle` icon button near the header that calls `onOpenGuide`

### What stays unchanged
- No backend changes
- No new dependencies
- All existing modals/overlays unaffected

