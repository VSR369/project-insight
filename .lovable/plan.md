

## Status & Remaining Work

### What's Already Implemented
1. **`src/utils/markdownToHtml.ts`** — Custom parser with callouts, tables, inline formatting ✅
2. **`src/lib/aiContentFormatter.ts`** — Uses custom `markdownToHtml` instead of `marked` ✅
3. **`src/components/ui/RichTextEditor.tsx`** — Tiptap with 2-row toolbar, font family, 15 brand colors, save button, media panel ✅
4. **`src/index.css`** — Full `.editor-content` CSS system ✅
5. **`src/components/ui/AiContentRenderer.tsx`** — Uses `editor-content` class ✅

### What's NOT Implemented Yet

The final instruction — **"Apply the editor-content CSS classes to every content display section across the entire platform"** — is incomplete. Several components render rich content without the `editor-content` styling:

| File | Issue |
|------|-------|
| `SafeHtmlRenderer.tsx` | Uses `prose prose-sm` instead of `editor-content` |
| `CompiledView.tsx` | Renders narrative as plain `<p>` — no rich formatting at all |
| `PulseContentDetailPage.tsx` | Uses `prose prose-sm` for text content |
| `BillingForm.tsx` | Uses `prose prose-sm` with raw `dangerouslySetInnerHTML` |
| `DocxPreviewCanvas.tsx` | Uses `prose prose-sm` |
| `RegistrantCommThread.tsx` | Raw `dangerouslySetInnerHTML` with no formatting class |
| 6× Knowledge Centre pages | Manual bold parsing (`split('**')`) instead of `AiContentRenderer` |

### Plan: Apply `editor-content` Styling Platform-Wide

#### 1. Update `SafeHtmlRenderer.tsx`
Change default className from `prose prose-sm max-w-none text-foreground` to `editor-content max-w-none`. This automatically propagates to all `AiContentRenderer` HTML rendering and any direct `SafeHtmlRenderer` usage.

#### 2. Update `CompiledView.tsx`
Replace the plain `<p>` narrative display with `<AiContentRenderer>` so AI-synthesized narratives get proper formatting (headings, lists, bold, etc.).

#### 3. Update `PulseContentDetailPage.tsx`
Swap `prose prose-sm` wrapper to `editor-content` class.

#### 4. Update `BillingForm.tsx`
Add `editor-content` class to the terms content `dangerouslySetInnerHTML` wrapper.

#### 5. Update `DocxPreviewCanvas.tsx`
Add `editor-content` class alongside existing prose classes.

#### 6. Update `RegistrantCommThread.tsx`
Add `editor-content` class to the message body wrapper.

#### 7. Update 6 Knowledge Centre pages
Replace the manual `split('**')` bold parsing with `<AiContentRenderer content={item.content} compact />` in: `MarketplaceKCPage`, `InterviewReviewKCPage`, `MyWorkspaceKCPage`, `VerificationKnowledgeCentrePage`, `SeekerConfigKCPage`, `ReferenceDataKCPage`, `ContentInvitationsKCPage`, `DashboardKCPage`.

### Files to modify
- `src/components/ui/SafeHtmlRenderer.tsx`
- `src/components/pulse/cards/CompiledView.tsx`
- `src/pages/pulse/PulseContentDetailPage.tsx`
- `src/components/registration/BillingForm.tsx`
- `src/components/DocxPreviewCanvas.tsx`
- `src/components/admin/verifications/RegistrantCommThread.tsx`
- 6–8 Knowledge Centre page files (swap manual parsing → `AiContentRenderer`)

