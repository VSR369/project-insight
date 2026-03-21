

## Phase 1: AI Content Rendering Foundation

### Problem
AI-generated content across the challenge lifecycle (Spec Review, Curation, Field Assist) renders as plain text walls. The AI often returns markdown-style content (headings, bullet points, bold text) but the UI displays it as raw `<p>` tags with `whitespace-pre-line` or passes it through `SafeHtmlRenderer` which only handles HTML — not markdown.

### Affected Screens (Phase 1 scope)
1. **AISpecReviewPage** — `SectionContent` default renderer (line 684) renders AI text as plain `<p>` with `whitespace-pre-line`
2. **CurationReviewPage** — Uses `SafeHtmlRenderer` but AI can return markdown
3. **CurationAIReviewPanel** — Refined content preview uses `SafeHtmlRenderer`

### Changes

#### 1. Install `react-markdown` + `remark-gfm`
Add `react-markdown` and `remark-gfm` as dependencies. These handle markdown parsing with GitHub-flavored extensions (tables, strikethrough, task lists).

#### 2. Create `AiContentRenderer` component
**File:** `src/components/ui/AiContentRenderer.tsx`

A new component that:
- Accepts raw AI output (could be markdown, HTML, or plain text)
- Auto-detects format: if content has HTML tags, sanitize and render as HTML; if it has markdown markers (`#`, `*`, `-`, `|`), parse as markdown; otherwise render as formatted text
- Renders with proper prose typography: distinct heading sizes, bullet/numbered lists, bold/italic emphasis, code blocks
- Adds subtle background callout styling for blockquotes (used as "important" callouts)
- Applies the existing `prose prose-sm` Tailwind typography classes plus custom callout styles

#### 3. Create `AiDataTable` component
**File:** `src/components/ui/AiDataTable.tsx`

A "Data Review & Approval" component that:
- Accepts raw AI output containing comma-separated or pipe-delimited tabular data
- Parses it into a structured table with bold headers, alternating row shading, and clear cell dividers
- Uses the existing `Table` UI primitives
- Includes "Approve" and "Request Changes" action buttons below the table
- Exposes `onApprove` and `onRequestChanges` callbacks

#### 4. Update `AiContentRenderer` to auto-detect tables
If the AI output contains lines with `|` pipe characters (markdown table format) or consistent comma-separated rows, the renderer automatically delegates those blocks to `AiDataTable`.

#### 5. Replace plain text renderers in Phase 1 screens

- **AISpecReviewPage** `SectionContent` default case (line 678-689): Replace `<p className="...whitespace-pre-line...">` with `<AiContentRenderer content={displayValue} />`
- **CurationReviewPage** section renders: Replace `<SafeHtmlRenderer html={...} />` calls with `<AiContentRenderer content={...} />` for AI-populated fields (problem_statement, scope, description, eligibility, hook)
- **CurationAIReviewPanel** refined content preview (line 321-323): Replace `<SafeHtmlRenderer html={refinedContent} />` with `<AiContentRenderer content={refinedContent} />`

#### 6. Add callout styles to `index.css`
Add prose customization for blockquote callouts:
- Subtle background color (e.g., `bg-primary/5` with left border accent)
- Distinct from normal blockquotes to highlight important AI callout sections

### What's NOT in Phase 1
- Edge function prompt changes (telling AI to use markdown) — Phase 2
- Screening review page, public challenge detail page — Phase 2
- Pulse content rendering — Phase 3
- Approval/rejection workflow on `AiDataTable` — wired in Phase 2 when integrated with specific flows

### Technical Notes
- `react-markdown` with `remark-gfm` handles tables, bold, lists, headings natively
- The auto-detect logic checks for `<` (HTML), `#`/`*`/`-`/`|` (markdown), or falls back to plain text with `whitespace-pre-line`
- `AiContentRenderer` wraps `SafeHtmlRenderer` for HTML content and `ReactMarkdown` for markdown, keeping both paths

