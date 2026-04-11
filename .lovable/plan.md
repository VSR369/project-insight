

## Fix 5 — Sophisticated DigestPanel with Tabs, Preview, and Compare

### What Changes

Upgrade the DigestPanel from basic edit/read modes to a tabbed editing experience:

1. **Tabbed edit mode** — Replace plain textarea with `Tabs` component offering Edit / Preview / Compare views
2. **Section coverage indicators** — Detect which of 7 standard digest sections are present and warn about missing ones
3. **Compare view** — Side-by-side AI original vs curator version (only when `curator_edited` is true)
4. **Preview tab** — Read-only preview of draft text while editing
5. **Improved empty state** — Icon + CTA button instead of plain text
6. **Key facts grid** — Replace raw JSON `<pre>` with a formatted 2-column grid
7. **Refined word count** — Inline in tab header bar with color-coded thresholds (400/800)

### File: `src/components/cogniblend/curation/context-library/DigestPanel.tsx`

**Full rewrite** — consolidate `EditMode` and `ReadMode` sub-components back into the main component since the tabbed UI needs shared state. Key structural changes:

- Add imports: `Tabs, TabsContent, TabsList, TabsTrigger`, `Eye`, `SplitSquareHorizontal`, `AlertTriangle`
- Add `view` state: `'edit' | 'preview' | 'compare'`
- Add `sectionCoverage()` function with 7 standard section labels
- Replace `WordIndicator` component with inline word count badge in tab bar
- Empty state: centered layout with `BookOpen` icon + "Generate Digest" button
- Edit mode: 3-tab layout (edit textarea, preview pane, compare side-by-side)
- Read mode: digest text + formatted key facts grid + confirm row
- Remove unused constants (`TARGET_WORDS`, `WORD_WARNING_LOW`, `WORD_WARNING_HIGH`)

~200 lines total. No other files affected.

