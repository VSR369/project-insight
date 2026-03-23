

# Show TemplateSelector Grid in CA/CR View (ConversationalIntakePage)

## Problem
The CA/CR dashboard view (ConversationalIntakePage) shows only a tiny badge for the challenge template in view mode, instead of the full 8-card grid like the AM/RQ view. The AM/RQ-selected template should carry over and be visible + editable by CA/CR.

## Changes

### File: `src/pages/cogniblend/ConversationalIntakePage.tsx` (lines 978-993)

Replace the view-mode badge with the full `TemplateSelector` grid using the `disabled` prop (already built in previous work):

- **View mode**: Show `<TemplateSelector disabled selectedId={selectedTemplate?.id} />` — full grid, selected card highlighted, non-interactive
- **Edit/Create mode**: Show `<TemplateSelector onSelect={handleTemplateSelect} selectedId={selectedTemplate?.id} />` — full grid, interactive (already works)

This is a single block replacement — same pattern already used in `SimpleIntakeForm.tsx`.

## What stays the same
- Template restoration from `extended_brief.challenge_template_id` (line 490-493) — already works
- Template persistence on submit (line 575) — already works
- TemplateSelector component — no changes needed

