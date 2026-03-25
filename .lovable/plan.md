

# Fix AI Suggested Version: Text Wrapping and Collapsible Section

## Problem
1. **Line items truncate** — `EditableLineItems` uses single-line `<Input>` fields, so long text gets cut off
2. **AI Suggested Version block is not collapsible** — unlike other sections, it has no expand/collapse toggle

## Changes

### File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

**1. Replace `<Input>` with `<Textarea>` in `EditableLineItems` (lines 193-213)**
- Swap `Input` for `Textarea` (auto-resizing) so each line item wraps its full content
- Use `min-h-[2rem]` with `resize-none` and auto-grow via rows or CSS
- Keep the same numbered layout and delete button

**2. Wrap the entire AI Suggested Version block (lines 627-718) in a `Collapsible`**
- Add local state `suggestedVersionOpen` (default: `true`)
- The header row ("✨ AI Suggested Version") becomes a `CollapsibleTrigger` with a chevron toggle icon (▼/▲)
- The content (master-data chips, line items, table rows, rich text) goes inside `CollapsibleContent`
- Matches the same expand/collapse pattern used elsewhere in the panel

### Summary of edits
- Import `Textarea` from `@/components/ui/textarea`
- Add `suggestedVersionOpen` state
- Refactor `EditableLineItems` to use `Textarea` with `whitespace-pre-wrap` and auto-sizing
- Wrap suggested version content in `Collapsible` / `CollapsibleContent`
- Add chevron toggle to the "✨ AI Suggested Version" header

