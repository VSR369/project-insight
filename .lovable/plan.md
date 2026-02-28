

## Fix: PDF.js Hanging on Loading Spinner

### Root Cause
`pdfjs-dist` v4.9.155 uses **top-level `await`** internally, which requires the Vite build target to be `es2022` or higher. The current `vite.config.ts` has no `build.target` set (defaults to older ES target), so the dynamic `import('pdfjs-dist')` silently fails. The PDF.js worker CDN request never fires, and the spinner hangs forever.

### Fix (2 files)

**1. `vite.config.ts`** — Add `build.target: 'esnext'` so Vite supports top-level await:
```ts
build: {
  target: 'esnext',
  rollupOptions: { ... }
}
```

**2. `src/components/PdfPreviewCanvas.tsx`** — Add a timeout fallback so if PDF.js still fails for any reason, the user sees the error state with Download/Open options instead of an infinite spinner (e.g., 15-second timeout that sets status to `'error'`).

No other files change.

