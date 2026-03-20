

## Plan: Fix Spec Review Page — IP Model Empty, Button Disabled, Editor Question

### Issues Identified

1. **IP Model shows empty**: The `ip_model` field on the challenge record is likely `null` because the AI spec generation saves a normalized IP code (e.g., `IP-NEL`) but the spec review page renders it as raw text. When the challenge is newly created and `ip_model` is not yet populated by the AI (or the AI returned it but it wasn't saved to the DB), it shows "No content yet."

2. **"Approve & Continue" button always disabled**: The button requires `allAccepted` — meaning ALL 10 sections must be individually clicked with the check mark. This is extremely tedious UX. Users have to manually accept each of the 10 sections one by one before the button enables.

3. **Advanced Editor button**: The user questions whether this is needed on the spec review page.

### Proposed Changes

**File: `src/pages/cogniblend/AISpecReviewPage.tsx`**

- **Fix 1 — IP Model display**: Add a human-readable label map for IP model codes (e.g., `IP-EA` → "Exclusive Assignment", `IP-NEL` → "Non-Exclusive License"). If `ip_model` is empty/null, show a computed default from `computeSolverAssignment` signals or display "Not yet assigned."

- **Fix 2 — Enable "Approve & Continue" without requiring all sections accepted**: Change the button logic so it is always enabled (no `allAccepted` gate). The section-by-section accept/edit is an optional refinement workflow, not a mandatory gate. The user can review visually and click "Approve & Continue" at any time. The accepted-sections counter remains as an informational indicator.

- **Fix 3 — Remove "Advanced Editor" button**: Remove the "Advanced Editor" button from the STRUCTURED mode footer. Keep only the "Approve & Continue" button (and the Back button in the header). The Advanced Editor can still be accessed from the dashboard if needed.

### Technical Details

- Lines ~787-789: Remove `disabled={!allAccepted}` from the "Approve & Continue" button
- Lines ~782-786: Remove the "Advanced Editor" `Button` element  
- Lines ~688-693 (QUICK mode): Also remove "Open Editor" button for consistency
- IP Model section (line 78 in `SPEC_SECTIONS`): Add a display formatter that converts codes like `IP-EA` to readable labels, or auto-populate from the challenge's maturity/IP signals if empty

