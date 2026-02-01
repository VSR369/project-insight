
# Delete Option for Industry Pulse Posts - Implementation Plan

## Issue Confirmed

After auditing the codebase, I've confirmed that:

1. **The `useDeletePulseContent` hook EXISTS** in `src/hooks/queries/usePulseContent.ts` (lines 266-298) and properly performs soft delete with audit fields
2. **RLS policies already exist** for delete operations:
   - `Owners delete own pulse_content` → `is_pulse_provider_owner(provider_id)`
   - `Admin manage pulse_content` → `has_role(auth.uid(), 'platform_admin')`
3. **The UI does NOT expose the delete option** - The dropdown menu in both `ContentCard.tsx` and `PulseCardFeedItem.tsx` only shows: Share, Copy Link, Report

---

## Root Cause

The delete functionality is fully implemented at the backend and hook level, but **the UI components do not include a Delete menu item** or the logic to conditionally show it to authorized users.

---

## Implementation Plan

### Files to Modify

| File | Change |
|------|--------|
| `src/components/pulse/content/ContentCard.tsx` | Add Delete menu item with auth check |
| `src/components/pulse/content/PulseCardFeedItem.tsx` | Add Delete menu item with auth check |

### Technical Changes

#### 1. ContentCard.tsx - Add Delete Option

**Current dropdown (lines 184-189):**
```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem>Share</DropdownMenuItem>
  <DropdownMenuItem>Copy Link</DropdownMenuItem>
  <DropdownMenuItem className="text-destructive">Report</DropdownMenuItem>
</DropdownMenuContent>
```

**Changes needed:**

1. Add new props to `ContentCardProps`:
   - `onDelete?: (contentId: string) => void` - Delete handler
   - Accept `isAdmin?: boolean` from parent (to check platform admin role)

2. Calculate `canDelete` based on:
   - User is the content author (`content.provider_id === currentUserProviderId`)
   - OR user is platform admin (`isAdmin === true`)

3. Add conditional Delete menu item:
```tsx
{canDelete && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem 
      className="text-destructive"
      onClick={() => onDelete?.(content.id)}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </DropdownMenuItem>
  </>
)}
```

4. Import `Trash2` from lucide-react
5. Import `DropdownMenuSeparator` from the dropdown component

#### 2. PulseCardFeedItem.tsx - Add Delete Option

Same pattern as ContentCard:

1. Add props:
   - `onDelete?: (cardId: string) => void`
   - Receive creator comparison from `card.seed_creator_id === currentUserProviderId`

2. Add Delete menu item conditionally

#### 3. Parent Component Updates (PulseFeedPage.tsx)

1. Import and use `useDeletePulseContent` hook
2. Import and use `useUserRoles` hook to get `isAdmin`
3. Add delete confirmation dialog state
4. Pass `onDelete` handler to ContentCard/PulseCardFeedItem
5. Pass `isAdmin` prop to enable admin delete

**Example implementation:**
```tsx
// In PulseFeedPage.tsx
const { isAdmin } = useUserRoles();
const deleteMutation = useDeletePulseContent();
const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

const handleDeleteClick = (contentId: string, title?: string) => {
  setDeleteTarget({ id: contentId, title: title || 'this post' });
};

const handleConfirmDelete = async () => {
  if (deleteTarget) {
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }
};
```

#### 4. Delete Confirmation Dialog

Use the existing `DeleteConfirmDialog` component from `src/components/admin/DeleteConfirmDialog.tsx` for consistent UX:

```tsx
<DeleteConfirmDialog
  open={!!deleteTarget}
  onOpenChange={(open) => !open && setDeleteTarget(null)}
  title="Delete Post"
  itemName={deleteTarget?.title}
  onConfirm={handleConfirmDelete}
  isLoading={deleteMutation.isPending}
  isSoftDelete={true}
/>
```

---

## Security Considerations

1. **Frontend check is for UX only** - The actual security is enforced by RLS policies
2. **RLS policies verified**:
   - `is_pulse_provider_owner(provider_id)` checks if current user owns the content
   - `has_role(auth.uid(), 'platform_admin')` checks admin role
3. **Even if UI is bypassed**, the database will reject unauthorized deletes

---

## Updated Component Props

### ContentCard
```typescript
interface ContentCardProps {
  content: PulseContent & { /* existing */ };
  currentUserProviderId: string;
  isAdmin?: boolean;  // NEW
  onContentClick?: () => void;
  onProfileClick?: () => void;
  onCommentClick?: () => void;
  onDelete?: (contentId: string) => void;  // NEW
}
```

### PulseCardFeedItem
```typescript
interface PulseCardFeedItemProps {
  card: FeedCardItem;
  currentUserProviderId?: string;
  isAdmin?: boolean;  // NEW
  onCardClick?: () => void;
  onProfileClick?: () => void;
  onDelete?: (cardId: string) => void;  // NEW
}
```

---

## Implementation Summary

| Step | Action |
|------|--------|
| 1 | Update `ContentCard.tsx` - Add delete menu item with auth check |
| 2 | Update `PulseCardFeedItem.tsx` - Add delete menu item with auth check |
| 3 | Update `PulseFeedPage.tsx` - Add delete mutation, useUserRoles, and confirmation dialog |
| 4 | Add `DeleteConfirmDialog` to PulseFeedPage for confirmation UX |

---

## Testing Verification

After implementation, verify:
- [ ] Content author sees "Delete" option on their own posts
- [ ] Platform admin sees "Delete" option on ALL posts
- [ ] Regular users do NOT see "Delete" on others' posts
- [ ] Delete confirmation dialog appears before deletion
- [ ] Successful delete removes post from feed
- [ ] Error handling works if delete fails
