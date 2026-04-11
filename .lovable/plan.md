

## Fix 6 — SuggestionCard Inline Accept/Reject

### Changes

**1. `SuggestionCard.tsx`** — Full rewrite
- Remove `Checkbox`, `isSelected`, `onToggleCheck` props (bulk selection moves to SourceList checkboxes if needed later)
- New props: `onAccept(id)`, `onReject(id)`, `isAcceptPending`, `isRejectPending`
- Add `ExternalLink` icon button for URL sources
- Redesigned `ConfidenceBadge` with background color tiers (85%+, 70%+, below)
- Inline accept (green check) and reject (red X) buttons in a horizontal row

**2. `SourceList.tsx`** — Update `SuggestionCard` usage
- Remove `selectedSuggestionIds` state and `toggleSuggestion` logic
- Remove `Checkbox`-related props (`isSelected`, `onToggleCheck`) from SuggestionCard calls
- Pass `onAccept`, `onReject`, `isAcceptPending`, `isRejectPending` directly
- Keep "Accept Selected" bulk button but wire it to select-all or remove it (the user's snippet removes checkboxes from the card, so bulk select via checkboxes is dropped)
- Keep "Reject All" button

**3. `ContextLibraryDrawer.tsx`** — No changes needed (already passes `onAcceptOne`/`onRejectOne` to SourceList)

### Technical Details

- SuggestionCard becomes a simpler, action-focused card without checkbox state
- SourceList simplifies by removing `selectedSuggestionIds` Set and related handlers
- The "Accept Selected" bulk button is removed since individual cards no longer have checkboxes
- All accept/reject actions flow: SuggestionCard → SourceList → ContextLibraryDrawer → hook mutations

