

# Refined Performance Audit Prompt for Lovable.dev

Your original prompt is thorough but needs adjustment for Lovable's constraints (no CLI tools, no bundle analyzer plugins, no direct Vite config access, single-file-at-a-time editing). Here's the refined version tuned to what Lovable can actually execute.

---

## What Changes from Your Original

| Original Instruction | Why It Needs Change | Refined Approach |
|---|---|---|
| "Run bundle analysis with rollup-plugin-visualizer" | Lovable cannot install CLI tools or modify vite.config | Code-level audit of imports instead |
| Area 9 "single createClient" check | Already confirmed — only 1 client-side instance in `src/integrations/supabase/client.ts`; edge functions correctly use their own | Remove — no issue |
| "Check PurgeCSS / content config" | Tailwind v3+ with Vite purges automatically via `content` in `tailwind.config` | Remove — already handled |
| AREA 2 Realtime audit | Only 4 Realtime channels exist (verified via search). All have cleanup. None are duplicated or unfiltered broadly | Simplify to a verification pass |
| `select('*')` audit | Only 4 instances found, 2 in edge functions (acceptable), 1 in a test file, 1 in `ProfileMiniCard` and `useSeekerOrgApprovals` | Narrow scope |
| React.lazy check | Already done — all admin/reviewer/pulse pages use `lazy()` with Suspense | Remove — no issue |

---

## Refined Prompt (Ready for Lovable)

```
PERFORMANCE AUDIT & FIX — CogniBlend MPA System

Perform a targeted performance optimization on the MPA application (React + Supabase + TanStack Query). Fix every confirmed issue without breaking existing functionality, DB schema, RLS, business rules, query keys, Realtime channels, or UX flows.

═══════════════════════════════════════════════
RULE 1 — DO NOT BREAK ANYTHING
═══════════════════════════════════════════════

Do not change: DB schema, RLS policies, edge functions, React Query
query key names, Realtime channel names, route paths, component
public APIs, or any business rule enforcement.

═══════════════════════════════════════════════
RULE 2 — AUDIT FIRST, FIX ONLY CONFIRMED ISSUES
═══════════════════════════════════════════════

For each area below, read the relevant files, diagnose the specific
problem, then fix. If no issue exists, state "No issue found" and
move on.

───────────────────────────────────────────────
AREA 1 — React Query staleTime & gcTime Alignment
───────────────────────────────────────────────

Scan ALL useQuery hooks in src/hooks/queries/. Set these exact values
where they differ from what's currently set:

  usePlatformAdmins          → staleTime: 30_000, gcTime: 300_000
  useMyAssignments           → staleTime: 30_000, gcTime: 300_000, refetchInterval: 60_000
  useOpenQueue               → staleTime: 15_000, gcTime: 300_000
  useVerificationDetail      → staleTime: 15_000, gcTime: 300_000
  useVerificationChecks      → staleTime: 10_000, gcTime: 300_000
  useAdminNotifications      → staleTime: 10_000 (keep as-is, Realtime drives invalidation)
  useEngineAuditLog          → staleTime: 60_000, gcTime: 300_000
  useAllAdminMetrics         → staleTime: 60_000, gcTime: 300_000
  useMyMetrics               → staleTime: 60_000, gcTime: 300_000
  useReassignmentRequests    → staleTime: 20_000, gcTime: 300_000
  useMpaConfig               → staleTime: 60_000, gcTime: 300_000
  useConfigAuditLog          → staleTime: 60_000, gcTime: 300_000
  useNotificationAuditLog    → staleTime: 30_000, gcTime: 300_000
  useRegistrantThread        → staleTime: 15_000, gcTime: 300_000
  useTierPermissions         → staleTime: 60_000, gcTime: 300_000

Also: set refetchOnWindowFocus: false on ALL hooks that power list
screens with filter state. The global default already sets this to
false — verify no hook overrides it back to true.

Remove refetchInterval from any hook that ALSO has a Realtime
subscription invalidating the same query key. Exception:
useMyAssignments keeps its 60s interval (SLA tier changes).

Ensure every hook depending on a dynamic ID param (verificationId,
adminId) has enabled: !!paramName.

───────────────────────────────────────────────
AREA 2 — Supabase Realtime Subscription Audit
───────────────────────────────────────────────

There are 4 Realtime channels in the codebase:
  - verification-dashboard-realtime (VerificationDashboardPage)
  - admin_notifications_realtime (useAdminNotifications)
  - registrant_comms_{id} (useRegistrantThread)
  - reassignment_requests_changes (useReassignmentRequests)

For each, verify:
  ✓ Cleanup returns supabase.removeChannel(channel)
  ✓ Channel name is unique (no duplicates)
  ✓ Filter clause is present where applicable (e.g. admin_id filter
    on notifications channel if not already filtered by RLS)
  ✓ Subscription is inside useEffect with correct deps

Fix only confirmed issues.

───────────────────────────────────────────────
AREA 3 — select('*') Elimination
───────────────────────────────────────────────

Replace these confirmed select('*') usages with explicit columns:
  - src/components/pulse/widgets/ProfileMiniCard.tsx (profiles query)
  - src/hooks/queries/useSeekerOrgApprovals.ts (multiple queries)

Do NOT touch edge function files or test files.

───────────────────────────────────────────────
AREA 4 — React Rendering Performance
───────────────────────────────────────────────

Scan components that render list rows or cards in admin screens
(MOD-01 through MOD-07). For each:

  a) Wrap pure row/card components in React.memo if they receive
     only props (no direct context consumption).

  b) Move inline object/array literals out of JSX props into
     stable constants or useMemo.

  c) Wrap callback props passed to memoized children with
     useCallback.

  d) Split any component file over 400 lines into sub-components.

  e) Fix any useEffect with unstable object/function dependencies
     causing re-render loops.

Target components: admin list rows, queue cards, notification items,
verification check cards, performance metric cards, reassignment
request cards.

───────────────────────────────────────────────
AREA 5 — AdminShell & Layout Performance
───────────────────────────────────────────────

Check AdminShell.tsx and AdminHeader.tsx:

  a) If any context provider creates an inline value object without
     useMemo, wrap it.

  b) Confirm the notification bell uses Realtime subscription for
     updates (not polling). If refetchInterval is set on the
     unread count query AND Realtime is active, remove the interval.

  c) Confirm the shell renders sidebar + header immediately without
     blocking on data queries (Suspense boundary wraps only Outlet).

───────────────────────────────────────────────
AREA 6 — Heavy Import Audit
───────────────────────────────────────────────

Check if recharts, xlsx, html2pdf.js, mammoth, or pdfjs-dist are
imported at the app entry point or in eagerly-loaded components.
If found, move to lazy-loaded components only.

Verify all admin pages already use React.lazy() — they do, but
confirm no new eager imports were added recently.

───────────────────────────────────────────────
AREA 7 — Missing Pagination on List Queries
───────────────────────────────────────────────

Check these list hooks for .range() or .limit() usage:
  - usePlatformAdmins
  - useMyAssignments / useOpenQueue
  - useEngineAuditLog
  - useReassignmentRequests
  - useConfigAuditLog
  - useNotificationAuditLog (SCR-04-01)
  - useAllAdminMetrics

If any fetches unlimited rows without .limit(), add .limit(100)
as a safety cap. For screens with table pagination UI, wire up
.range(from, to) with page size 20.

═══════════════════════════════════════════════
REPORTING
═══════════════════════════════════════════════

After all 7 areas, output a summary table:

| Area | Issue Found | Fix Applied | Risk |
|------|-------------|-------------|------|

List any High Risk items separately with a manual test to verify.

Do not refactor component logic, rename functions, change UX, alter
schema, or modify business rules.
```

## Key Differences from Original

1. **Removed 2 full areas** (bundle analyzer, Supabase client check) — not actionable in Lovable or already confirmed clean
2. **Narrowed select('*') scope** to the 2 actual files with the issue
3. **Pre-identified all 4 Realtime channels** so the AI doesn't waste tokens searching
4. **Combined Areas 5+8 into one** (code splitting is already done)
5. **Removed MOD-05 specific area** — the current hooks already separate RPC vs stored metrics correctly; the staleTime fix in Area 1 covers it
6. **Added Area 7 (pagination)** as a standalone focused check since several hooks use `.limit(100)` but some may not

