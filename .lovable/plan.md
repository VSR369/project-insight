
# Completed: AI Diagnostic Dashboard + Dual-Mode Wave Progress Panel

## Implemented

### AI Diagnostic Dashboard (`/cogni/curation/:id/diagnostics`)
- **DiagnosticsReviewPanel**: Pass 1 wave-by-wave table with status, action, comment counts, and consultant review level
- **DiagnosticsSuggestionsPanel**: Pass 2 wave-by-wave table with suggestion status and consultant level
- **DiagnosticsDiscoveryPanel**: 4-step context discovery pipeline status (Search → Extraction → Consolidation → Digest)
- **useDiagnosticsData hook**: Fetches attachments, digest, and importance levels from DB
- **IMPORTANCE_TO_LEVEL mapping**: Critical→Principal, High→Senior, Medium→Consultant, Low→Junior
- **Sidebar link**: "Diagnostics" button next to "Preview" in CurationRightRail

### Dual-Mode Wave Progress Panel (prior)
- `passType` prop threads from executor → orchestrator → page → right rail → panel
- Pass 1 shows "Analysed" + comment counts; Pass 2 shows "Suggestions Generated" + suggestion counts
