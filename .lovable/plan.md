
## Fix Plan: Audio Upload "MIME type not supported" Error

### Root Cause Analysis (5-Why)

| Level | Question | Answer |
|-------|----------|--------|
| 1 | Why is the podcast failing to publish? | Upload fails with "mime type audio/webm is not supported" |
| 2 | Why is audio/webm not supported? | The Supabase Storage bucket `pulse-media` has an `allowed_mime_types` whitelist |
| 3 | Why isn't audio/webm in the whitelist? | The original migration only included: `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4` |
| 4 | Why is the recording using audio/webm? | MediaRecorder in Chrome/Edge defaults to `audio/webm;codecs=opus` (most efficient codec) |
| 5 | Why wasn't this caught earlier? | The client-side validation in `media.ts` correctly includes `audio/webm`, but server-side bucket doesn't match |

### The Problem

**Client-side validation (allows webm):**
```typescript
// src/lib/validations/media.ts line 22
podcast: { 
  types: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg'],
  ...
}
```

**Server-side bucket (missing webm):**
```sql
-- Migration line 551
allowed_mime_types: ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
-- ❌ Missing: 'audio/webm'
```

### Solution: Add `audio/webm` to Storage Bucket

Create a new migration to update the `pulse-media` bucket's allowed MIME types to include `audio/webm`.

#### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_add_audio_webm_to_pulse_bucket.sql` | Add `audio/webm` to allowed MIME types |

#### Migration SQL

```sql
-- Update pulse-media bucket to allow audio/webm MIME type
-- This is required because MediaRecorder in Chrome/Edge records audio as audio/webm;codecs=opus
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp', 
  'video/mp4', 
  'video/webm', 
  'audio/mpeg', 
  'audio/wav', 
  'audio/ogg', 
  'audio/mp4',
  'audio/webm'  -- ADD THIS
]
WHERE id = 'pulse-media';
```

### Why This Fixes the Problem

1. **Recording flow unchanged** - AudioRecorder already produces valid `audio/webm` blobs
2. **Client validation passes** - `media.ts` already allows `audio/webm`
3. **Server now accepts it** - Bucket will allow the upload
4. **No code changes needed** - Only database migration

### Verification After Fix

1. Record audio in the Podcast Studio
2. Console should show: `[AudioRecorder] Created blob: XXXX bytes, type: audio/webm`
3. Upload should succeed (no "mime type not supported" error)
4. Content should appear in Pulse feed

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Migration fails | Use `WHERE id = 'pulse-media'` to only affect the specific bucket |
| Existing files affected | No - this only changes upload permissions, not existing files |
| Security concern | None - `audio/webm` is a standard browser format, not a security risk |

### Summary

This is a **configuration mismatch** between client-side and server-side validation. The fix is a single SQL migration to add `audio/webm` to the bucket's allowed MIME types. No code changes required.
