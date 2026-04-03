

# Gap Analysis & Fix Plan — Legal Document Management System

## Issues Found

### CRITICAL: PMA Modal Cannot Be Closed (User-Reported Bug)

**Root cause:** The `LegalGateModal` uses Shadcn `DialogContent` which renders an X close button by default. The modal blocks closing via `onOpenChange={() => {}}`, `onPointerDownOutside`, and `onEscapeKeyDown` — but the X button is still clickable and appears to do nothing, confusing the user. Additionally, if the RPC returns an error or the PMA template has no content, the user is stuck.

**Fix:** Hide the X close button with CSS (`[&>button]:hidden` on DialogContent). The user must Accept or Decline — that is per spec.

### MISSING: Document Upload Feature (6 files)

The spec requires an "Upload Document" button in the editor top bar that accepts .docx/.pdf/.txt, converts to HTML via mammoth.js, and replaces TipTap content. **None of these files exist:**

| Missing File | Purpose |
|---|---|
| `LegalDocUploadHandler.tsx` | Upload button + file picker + conversion logic |
| `LegalDocUploadConfirmDialog.tsx` | "Replace current content?" warning dialog |
| `useLegalDocUpload.ts` | Upload to Supabase Storage + mammoth conversion hook |
| `LegalDocSectionTabs.tsx` | IPAA section tabs (abstract/milestone/detailed/final_award) |
| `useLegalDocEditor.ts` | Separate editor save/publish hook (currently inlined in page) |
| `LegalGateScrollTracker.tsx` | Standalone scroll progress component (currently inlined in viewer) |

The editor page also has no "Upload Document" button in the top bar — the spec explicitly requires one.

### MISSING: Auto-save Every 30 Seconds

The spec requires auto-save of the editor content every 30 seconds. Not implemented.

### Other Gaps

1. **CSS uses HSL tokens** — already adapted correctly (the spec shows `var(--color-text-primary)` but the implementation uses `hsl(var(--foreground))` which matches the project's Shadcn theme). This is fine.
2. **Database, trigger config, acceptance log, RPC, storage bucket** — all correctly implemented and match the spec.
3. **13 trigger rules** — all 15 rows (13 logical rules, 2 having STRUCTURED+CONTROLLED splits) correctly seeded.
4. **Starter templates** — all 5 seeded with professional HTML content.
5. **AuthGuard integration** — PMA gate on first login is wired correctly.

---

## Implementation Plan

### Step 1: Fix LegalGateModal close button

Hide the default X button on `DialogContent` so users cannot attempt to close without Accept/Decline.

**File:** `src/components/legal/LegalGateModal.tsx`
- Add `[&>button]:hidden` class to DialogContent

### Step 2: Create Document Upload Feature (4 new files + 2 edits)

**New files:**
- `src/components/admin/legal/LegalDocUploadHandler.tsx` (~100 lines) — File input button, accepts .docx/.pdf/.txt, calls upload hook
- `src/components/admin/legal/LegalDocUploadConfirmDialog.tsx` (~50 lines) — AlertDialog warning when content exists
- `src/hooks/admin/useLegalDocUpload.ts` (~90 lines) — Uploads file to `legal-documents` bucket, converts .docx via mammoth.js to HTML, wraps .txt/.pdf text in `<p>` tags
- `src/components/admin/legal/LegalDocSectionTabs.tsx` (~50 lines) — Tab bar for IPAA sections (abstract, milestone, detailed, final_award)

**Edits:**
- `src/pages/admin/legal/LegalDocumentEditorPage.tsx` — Add "Upload Document" button to top bar, wire upload handler, add auto-save interval (30s)

### Step 3: Add auto-save to editor

In `LegalDocumentEditorPage.tsx`, add a `useEffect` with `setInterval` that calls `handleSave` every 30 seconds when content has changed (dirty flag).

### Step 4: Extract useLegalDocEditor hook

Move save/publish logic from `LegalDocumentEditorPage` into `src/hooks/admin/useLegalDocEditor.ts` to follow layer separation rules.

---

## Summary

| Category | Status |
|---|---|
| Database migration | Done |
| Trigger config (13 rules) | Done |
| Acceptance log + forensics | Done |
| check_legal_gate RPC | Done |
| Storage bucket | Done |
| Starter templates (5 docs) | Done |
| Legal stylesheet | Done |
| Editor page + TipTap | Done |
| Editor toolbar + quick inserts | Done |
| Config sidebar | Done |
| Version history | Done |
| Publish dialog | Done |
| List page + cards | Done |
| Trigger config page | Done |
| Legal Gate Modal | Done (close button fix needed) |
| Document Viewer | Done |
| Gate Actions (checkbox + scroll) | Done |
| AuthGuard PMA integration | Done |
| **Upload handler** | **MISSING** |
| **Upload confirm dialog** | **MISSING** |
| **Upload hook (mammoth)** | **MISSING** |
| **Section tabs (IPAA)** | **MISSING** |
| **Auto-save (30s)** | **MISSING** |
| **useLegalDocEditor hook** | **MISSING** |
| **Modal X button hidden** | **BUG** |

Total: 4 new files, 2 file edits, 1 bug fix.

