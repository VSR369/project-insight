

# Plan: Rich Text Editor with Full-Window Expand + Beneficiaries Section

## Changes

### 1. `src/components/cogniblend/SimpleIntakeForm.tsx`

**a) Replace `<Textarea>` with `<RichTextEditor>`** for the "Problem / Possibility Idea" field in the RQ (Aggregator) section:
- Import `RichTextEditor` and `Controller` (already imported)
- Switch from `register('problem_summary')` to a `Controller` render with `<RichTextEditor>`
- Update schema: increase `problem_summary` max from 1000 to 5000 (rich text is longer)

**b) Add expand-to-fullscreen button** next to the editor label:
- Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
- Import `Maximize2`, `Minimize2` from `lucide-react`
- Add state `const [editorFullscreen, setEditorFullscreen] = useState(false)`
- Render a small icon button (Maximize2) beside the label
- When clicked, open a `Dialog` with `max-w-4xl h-[80vh]` containing the same `RichTextEditor` bound to the same form field — changes sync both ways
- Dialog has a close button to return to inline view

**c) Add new optional section: "Beneficiaries & Benefits Mapping"**:
- Add `beneficiaries_mapping` field to `aggSchema` as `z.string().optional().default('')`
- Add a new card section after the Problem/Idea editor with:
  - Label: "Beneficiaries & Benefits Mapping" with "(Optional)" tag
  - A `RichTextEditor` with placeholder: "Who will benefit from solving this? Map stakeholders to expected benefits..."
  - Also gets an expand-to-fullscreen button
- Add `beneficiariesFullscreen` state for second dialog

**d) Update `buildPayload`** to include `beneficiaries_mapping` in the submission data, stored alongside problem_summary.

### 2. `src/hooks/cogniblend/useSubmitSolutionRequest.ts`

- Add `beneficiariesMapping?: string` to `SubmitPayload` and `DraftPayload`
- Store it in the challenge's `extended_brief` JSONB: `{ beneficiaries_mapping: payload.beneficiariesMapping }`
- Merge with existing extended_brief update or add alongside eligibility update

## Files Modified

| File | Change |
|------|--------|
| `SimpleIntakeForm.tsx` | RichTextEditor for problem field, fullscreen dialog, new beneficiaries section |
| `useSubmitSolutionRequest.ts` | Accept and persist beneficiaries_mapping in extended_brief |

