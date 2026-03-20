

## Plan: Two-Tab Demo Login with Explicit AI vs Manual Paths

### Problem
The demo login page mixes all roles into a single flat grid, making it unclear which workflow path to follow. The AI-Assisted path is incomplete — it lacks screens for Legal Coordinator, Curator, and Innovation Director. Meanwhile the Manual Editor path (8-step wizard) is fully functional. Users need two clearly separated demo experiences.

### Design

**DemoLoginPage** gets two tabs:
- **Tab 1: "AI-Assisted Path"** — Each role card shows the AI-path-specific action and description. On login, navigates to the appropriate AI workflow screen for that role. Each role card includes a step indicator (e.g., "Step 2: Spec Review", "Step 3: Legal Docs", "Step 4: Curation").
- **Tab 2: "Manual Editor Path"** — Same roles but descriptions reference the 8-step wizard. On login, navigates to the manual editor entry point.

After login, a `demoPath` value (`ai` or `manual`) is stored in `sessionStorage` so downstream pages can optionally show path-aware hints.

**Role-specific login destinations:**

| Role | AI Path Destination | Manual Path Destination |
|------|-------------------|----------------------|
| RQ (Requestor) | `/cogni/challenges/create?tab=ai` | `/cogni/challenges/create?tab=editor` |
| CR (Creator) | `/cogni/challenges/create?tab=ai` | `/cogni/challenges/create?tab=editor` |
| LC (Legal) | `/cogni/legal-review` | `/cogni/legal-review` |
| CU (Curator) | `/cogni/curation` | `/cogni/curation` |
| ID (Director) | `/cogni/approval` | `/cogni/approval` |
| ER (Reviewer) | `/cogni/review` | `/cogni/review` |
| FC (Finance) | `/cogni/escrow` | `/cogni/escrow` |
| Solo | `/cogni/dashboard` | `/cogni/dashboard` |

For downstream roles (LC, CU, ID), both paths use the same screens since those screens already show AI-generated content in read-only mode with AI review panels. The difference is that in the AI path, the challenge arrives pre-populated by AI; in the manual path, it arrives from the 8-step wizard.

### Changes

**File 1: `src/pages/cogniblend/DemoLoginPage.tsx`** (major rewrite)

- Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- Add `Sparkles` and `Settings2` icons for tab headers
- Split `DEMO_USERS` into a single array but add path-specific descriptions and destinations:
  ```ts
  interface DemoUser {
    email: string;
    displayName: string;
    roles: string[];
    aiDescription: string;      // Description shown in AI tab
    manualDescription: string;   // Description shown in Manual tab
    aiDestination: string;       // Route after login in AI path
    manualDestination: string;   // Route after login in Manual path
    stepLabel?: string;          // e.g. "Step 2" for workflow context
  }
  ```
- Wrap the role cards grid inside `<Tabs defaultValue="ai">` with two `TabsContent` panels
- Each panel renders the same users but with path-specific description and a colored path indicator badge
- `handleLogin` accepts a `path: 'ai' | 'manual'` parameter:
  - Stores `sessionStorage.setItem('cogni_demo_path', path)` 
  - Navigates to the path-specific destination instead of always `/cogni/dashboard`
- Add a workflow visualization at top of each tab showing the 6-step flow with role assignments, highlighting which steps are AI-driven vs manual
- Tab 1 header: "AI-Assisted Path" with Sparkles icon and subtitle "AI generates, roles review"
- Tab 2 header: "Manual Editor Path" with Settings2 icon and subtitle "8-step wizard, full control"
- Solo user (Sam Solo) appears in both tabs — AI tab navigates to `/cogni/challenges/create?tab=ai`, Manual tab to `/cogni/challenges/create?tab=editor`

**Visual layout per tab:**
```text
┌─────────────────────────────────────────────────┐
│  Workflow:  Create → Review → Legal → Curation  │
│             → Approval → Publication            │
│  [Step 1]   [Step 2]  [Step 3]  [Step 4]  ...   │
└─────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Chris Rivera │ │ Leslie Chen  │ │ Casey Underw │
│ CR           │ │ LC           │ │ CU           │
│ Step 1-2     │ │ Step 3       │ │ Step 4       │
│ Creates &    │ │ Reviews      │ │ AI quality   │
│ reviews AI   │ │ legal docs   │ │ assessment   │
│ spec         │ │ attached by  │ │ + checklist   │
│              │ │ creator      │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

### What This Does NOT Change
- No changes to any workflow pages (AISpecReviewPage, CurationReviewPage, ApprovalReviewPage, LegalDocumentAttachmentPage)
- No changes to routing in App.tsx
- No changes to edge functions
- No new database tables or migrations
- The `sessionStorage` value is purely informational — existing pages continue to work identically regardless of path

### Technical Details
- `sessionStorage` (not `localStorage`) ensures path context clears when the browser tab closes, preventing stale state
- The Seed Data card remains above the tabs (shared for both paths)
- Tab selection persists via React state only (no URL param needed for demo login itself)
- Role cards remain clickable with the same login logic; only the post-login destination changes

