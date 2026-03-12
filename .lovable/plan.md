

# Fix: Show Role Display Names Instead of Codes in MSME Quick Assign

## Problem
In the "Existing Team Member" tab, member cards display raw role codes (`R2`, `R6_MP`, `R4`, `R8`) instead of human-readable names like "Account Manager", "Challenge Curator", etc.

## Fix — `src/components/rbac/MsmeQuickAssignModal.tsx`

### Line 301-306 — Replace raw code with display name in member role badges

Build a quick lookup from `allRoles` and use it to resolve display names:

```typescript
// Inside the member card's role badges (line 302-305):
{member.roles.map((rc) => {
  const roleMeta = allRoles?.find((r) => r.code === rc);
  return (
    <Badge key={rc} variant="secondary" className="text-[10px] px-1.5 py-0">
      {roleMeta?.display_name ?? rc}
    </Badge>
  );
})}
```

Key changes:
- Remove `font-mono` class from the badge (display names aren't monospaced codes)
- Use `display_name` from the role catalog, falling back to code if not found
- Keep badge sizing compact (`text-[10px]`) so the layout doesn't break with longer names

This is a single-line-logic change in one file. No other files affected.

