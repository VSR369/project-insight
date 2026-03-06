

## Fix: Clean Up Quick Login Grid Layout

The 6 accounts in a single row (`grid-cols-3 lg:grid-cols-6`) causes cramped, cluttered buttons as shown in the screenshot.

### Change

**File: `src/pages/Login.tsx` (line 557)**

Replace the grid with a clean **two-row layout**: Row 1 = Admin tiers (3 buttons), Row 2 = Other portals (3 buttons), with a subtle label for each row.

```
Row 1:  "Admin Tiers"
        [Supervisor]  [Senior Admin]  [Basic Admin]

Row 2:  "Portals"
        [Provider]    [Reviewer]      [Seeking Org]
```

- Use `grid grid-cols-3 gap-3` (always 3 columns, never 6)
- Add a small muted label above each row: "Platform Admins" and "Portal Accounts"
- Increase button padding slightly for better touch targets
- Show full email without truncation since 3-col gives more space

Single file change, no logic changes — purely layout.

