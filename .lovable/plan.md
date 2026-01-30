
# Fix: Camera Recording Validation Failure

## Problem
After recording a video with the camera, clicking "Stop Recording" shows the error:
```
Unsupported format. Allowed: .mp4, .mov, .avi, .webm
```

## Root Cause Analysis (5-Why)

| Level | Question | Answer |
|-------|----------|--------|
| Why #1 | Why is the error appearing? | `validateFile()` rejects the recorded file's MIME type |
| Why #2 | Why does validation fail? | The recorded file has `type: "video/webm;codecs=vp9,opus"` |
| Why #3 | Why doesn't that match? | Allowed types are `['video/mp4', 'video/webm', ...]` - exact match only |
| Why #4 | Why exact matching? | `limits.types.includes(file.type)` uses strict equality |
| **Root Cause** | | MediaRecorder creates MIME types with codec suffixes that don't exactly match the allowed list |

## Technical Details

**Current Validation (Line 97 in media.ts):**
```typescript
if (!(limits.types as readonly string[]).includes(file.type)) {
  // This fails because:
  // file.type = "video/webm;codecs=vp9,opus"
  // limits.types = ["video/webm", "video/mp4", ...]
  // "video/webm;codecs=vp9,opus" !== "video/webm" → REJECTED
}
```

**Recorded File Properties:**
- `file.type`: `"video/webm;codecs=vp9,opus"` (with codec info)
- `file.name`: `"recording_1706589123456.webm"` (correct extension)

## Solution

Update `validateFile()` to use **base MIME type matching** instead of exact matching:

**Option A: Strip codec suffix before comparison (Recommended)**
```typescript
// Get base MIME type (everything before semicolon)
const baseMimeType = file.type.split(';')[0].trim();

if (!(limits.types as readonly string[]).includes(baseMimeType)) {
  return { valid: false, error: `Unsupported format...` };
}
```

**Option B: Use startsWith matching**
```typescript
const isValidType = limits.types.some(
  type => file.type === type || file.type.startsWith(type + ';')
);
```

I recommend **Option A** as it's cleaner and handles all codec variations.

## Implementation

**File: `src/lib/validations/media.ts`**

Update the `validateFile` function to normalize MIME types before comparison:

```typescript
export function validateFile(file: File, contentType: MediaContentType): FileValidationResult {
  const limits = MEDIA_LIMITS[contentType];
  
  if (!limits) {
    return { valid: false, error: 'Unknown content type' };
  }

  // Check file size
  if (file.size > limits.maxSize) {
    return { 
      valid: false, 
      error: `File exceeds ${limits.label} limit (${formatBytes(file.size)})` 
    };
  }

  // Check MIME type - normalize to base type (strip codec parameters)
  // MediaRecorder produces types like "video/webm;codecs=vp9,opus"
  // We need to match against base types like "video/webm"
  const baseMimeType = file.type.split(';')[0].trim().toLowerCase();
  
  if (!(limits.types as readonly string[]).includes(baseMimeType)) {
    const allowedExts = limits.extensions.join(', ');
    return { 
      valid: false, 
      error: `Unsupported format. Allowed: ${allowedExts}` 
    };
  }

  return { valid: true };
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/validations/media.ts` | Update `validateFile()` to normalize MIME types before comparison |

## Expected Outcome

After this fix:
- Camera recordings with `video/webm;codecs=vp9,opus` will match `video/webm`
- Safari recordings with `video/mp4;codecs=avc1` will match `video/mp4`
- Regular file uploads continue to work as before
- All reel content types (recorded and uploaded) will validate correctly
