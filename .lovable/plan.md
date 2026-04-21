

# Plan — Two-tab layout for the LC Legal Workspace

## Goal

Replace the long vertical stack on `/cogni/challenges/:id/lc-legal` with two tabs:

1. **Legal Review** (default, opens first)
2. **Curated Challenge**

Header, step indicator, workflow banner, status alerts, and the submit footer stay outside the tabs so they remain visible at all times.

## New layout

```text
┌─ Header: ← back · Shield · "Legal Coordinator Workspace" · challenge title ─┐
│  [ Read-only banner if lc_compliance_complete ]                              │
│  [ Step indicator: 1 → 2 → 3 ]                                               │
│  [ WorkflowProgressBanner step=3 ]                                           │
│                                                                               │
│  ┌─ Tabs ─────────────────────────────────────────────────────────────────┐  │
│  │  [ Legal Review ]   [ Curated Challenge ]                              │  │
│  │ ───────────────────────────────────────────────────────────────────────│  │
│  │                                                                         │  │
│  │  TAB 1 — Legal Review (default)                                        │  │
│  │   • LcSourceDocUpload  (upload source docs)                            │  │
│  │   • LcUnifiedAgreementCard  (Consolidate / Enhance / editor / Accept)  │  │
│  │   • LcAttachedDocsCard  (final list of attached docs)                  │  │
│  │                                                                         │  │
│  │  TAB 2 — Curated Challenge                                             │  │
│  │   • LcFullChallengePreview  (read-only curated challenge content)      │  │
│  │                                                                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  [ Gate-failure alerts ]                                                      │
│  [ LcLegalSubmitFooter — Submit to Curator ]                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Why this split

- **Legal Review** is where the LC actually works — uploads, consolidation, AI enhance, editor, accept.
- **Curated Challenge** is reference reading — the curated brief the LC consults while drafting. Tucking it into a tab removes 60–70% of the scroll.
- Submit footer stays outside the tabs so the LC can submit from either tab without context-switching.
- The step indicator stays outside so progress (1 → 2 → 3) is always visible.

## Files touched

1. **`src/pages/cogniblend/LcLegalWorkspacePage.tsx`** (only file edited)
   - Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`.
   - Add local state: `const [activeTab, setActiveTab] = useState<'legal' | 'challenge'>('legal')`.
   - Move `LcFullChallengePreview` inside the `Curated Challenge` tab.
   - Move `LcSourceDocUpload`, `LcUnifiedAgreementCard`, and `LcAttachedDocsCard` inside the `Legal Review` tab.
   - Keep header, read-only banner, step indicator, `WorkflowProgressBanner`, gate-failure alerts, and `LcLegalSubmitFooter` outside the tabs.
   - File stays well under 250 lines (target: ~200).

2. **No changes** to:
   - Child components (`LcSourceDocUpload`, `LcUnifiedAgreementCard`, `LcFullChallengePreview`, `LcAttachedDocsCard`, `LcLegalSubmitFooter`).
   - Hooks, services, mutations, RPCs.
   - Database schema or edge functions.
   - The Curator (`CuratorComplianceTab`) layout — it's a separate flow and isn't affected.

## Behaviour details

- **Default tab**: `Legal Review` (the LC's primary work surface).
- **Tab persistence**: not persisted across reloads — this is a focused workspace; default-to-Legal-Review is the right call every time.
- **Accessibility**: shadcn `Tabs` already wires roving focus, `role="tablist"`, `aria-controls`, and Enter/Arrow keys.
- **Responsive**: tabs render full-width on mobile, inline on `lg:` and up — no extra breakpoint work needed.
- **Read-only mode** (`lc_compliance_complete`): the read-only banner still shows above the tabs; tab content already respects the read-only state via existing component logic.

## Verification

1. Navigate to `/cogni/challenges/<id>/lc-legal` — `Legal Review` tab is selected by default.
2. The Source Upload, Unified Agreement editor, and Attached Docs are all on this tab.
3. Click `Curated Challenge` — the full challenge preview renders; nothing else moves.
4. Submit footer is visible from both tabs and works identically.
5. Step indicator above the tabs updates as LC progresses (1 → 2 → 3).
6. `lc_compliance_complete` read-only banner still appears above the tabs.
7. `npx tsc --noEmit` passes; file stays under 250 lines.

## Out of scope

- Any change to the Curator legal tab.
- Renaming "Pass 3 — AI Legal Review" (already renamed to "Legal Review" in the prior change).
- DB or edge function changes.
- Persisting the active tab in URL/localStorage.

