

## Smooth Section Navigation with Expand & Highlight

### What this does
When a curator clicks a section name in the AI Quality Assessment panel (gaps list) or the Curator Guide Modal (dependency section), the app will:
1. Switch to the correct tab/group containing that section
2. Expand the section panel if collapsed
3. Smooth-scroll to it
4. Temporarily highlight it with a contrasting ring/border (fades after 3 seconds)

### How it works

**1. Shared navigation event system** — `src/lib/cogniblend/sectionNavigation.ts` (new, ~30 lines)
- Export a custom event dispatcher: `dispatchNavigateToSection(sectionKey: string)`
- Export a hook: `useSectionNavigationListener(callback)` that listens for the event
- Uses `CustomEvent` on `window` — no prop drilling needed

**2. SectionPanelItem listens for navigation events** — modify `SectionPanelItem.tsx`
- Listen for the navigation event matching its `section.key`
- When triggered: force-expand the `CuratorSectionPanel` and apply a temporary highlight ring class
- Highlight: `ring-2 ring-primary ring-offset-2` with a 3-second timeout to remove

**3. CuratorSectionPanel accepts `forceExpand` prop** — modify `CuratorSectionPanel.tsx`
- New optional prop `forceExpand?: number` (increment to trigger)
- `useEffect` on `forceExpand` sets `isExpanded = true` and scrolls into view

**4. handleNavigateToSection upgraded** — modify `useCurationCallbacks.ts`
- After `setActiveGroup`, dispatch the custom navigation event so the section expands + highlights
- Add a small delay (300ms) to let the group tab render before dispatching

**5. QualityPanelCards gap items become clickable** — modify `QualityPanelCards.tsx`
- The `gap.field` values correspond to section keys (e.g., `problem_statement`, `scope`)
- Wrap the field name in a clickable `<button>` that calls `onNavigateToSection(gap.field)`
- Pass `onNavigateToSection` prop down from `AICurationQualityPanel` → `QualityAssessmentContent`

**6. AICurationQualityPanel receives `onNavigateToSection`** — modify `AICurationQualityPanel.tsx`
- Add `onNavigateToSection` prop, pass through to `QualityAssessmentContent`

**7. CurationRightRail passes `onNavigateToSection` to AICurationQualityPanel** — already has the prop, just needs wiring

**8. CuratorGuideModal dependency section gets clickable section names** — modify `CuratorGuideModal.tsx`
- Make "Problem Statement", "Scope", "Expected Outcomes" etc. clickable links
- On click: close the modal + call `onNavigateToSection`
- Add `onNavigateToSection` prop to `CuratorGuideModal`

### Files changed

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/cogniblend/sectionNavigation.ts` | **Create** | Custom event dispatcher + listener hook (~30 lines) |
| `src/components/cogniblend/curation/SectionPanelItem.tsx` | **Modify** | Listen for nav events, force-expand + highlight |
| `src/components/cogniblend/curation/CuratorSectionPanel.tsx` | **Modify** | Add `forceExpand` prop to expand + scroll |
| `src/hooks/cogniblend/useCurationCallbacks.ts` | **Modify** | Dispatch nav event after group switch |
| `src/components/cogniblend/curation/QualityPanelCards.tsx` | **Modify** | Make gap field names clickable |
| `src/components/cogniblend/curation/AICurationQualityPanel.tsx` | **Modify** | Accept + pass `onNavigateToSection` |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | **Modify** | Wire `onNavigateToSection` to quality panel |
| `src/components/cogniblend/curation/CuratorGuideModal.tsx` | **Modify** | Make dependency section names clickable |
| `src/pages/cogniblend/CurationReviewPage.tsx` | **Modify** | Pass `onNavigateToSection` to guide modal |

### Highlight behavior
- CSS: `ring-2 ring-primary ring-offset-2 transition-all duration-500` applied on navigate
- Removed after 3 seconds via `setTimeout`
- Stacks with the existing warning highlight without conflict (different ring colors)

