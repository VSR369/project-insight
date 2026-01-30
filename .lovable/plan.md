
# Fix: Video Recording Black Screen / No Audio

## Confirmed Root Cause

Looking at the current code (lines 378-407), the bug is exactly as described:

```typescript
// Current stopRecording() - PROBLEMATIC
const stopRecording = useCallback(() => {
  console.log('[VideoUploader] stopRecording called');
  
  // Request final data before stopping
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.requestData();
    mediaRecorderRef.current.stop();
  }
  
  // ❌ BUG: Cleanup happens IMMEDIATELY, before onstop fires
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => {
      track.stop();  // ← Kills the stream while MediaRecorder still needs it
    });
    streamRef.current = null;
  }
  
  // ❌ BUG: Clears video before MediaRecorder finalizes
  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
  
  // Note: setCameraState('idle') is handled in mediaRecorder.onstop
}, []);
```

**Timeline Problem:**
```text
[stop() called] → [tracks killed] → [srcObject cleared] → [onstop fires] → [blob created]
                         ↑                  ↑
                    MediaRecorder still needs these to finalize!
```

## Solution Summary

| Change | Location | Purpose |
|--------|----------|---------|
| 1. Add `'stopping'` camera state | Type definition + state | Show "Finalizing..." UI |
| 2. Remove ALL cleanup from `stopRecording()` | Lines 387-404 | Let MediaRecorder finalize first |
| 3. Move ALL cleanup INTO `mediaRecorder.onstop` | Lines 313-341 | Cleanup AFTER blob is created |
| 4. Reorder VP8 before VP9 | Lines 32-38 | More stable codec |
| 5. Use base MIME type for Blob/File | Line 327 | Better compatibility |
| 6. Add minimum size validation | Inside onstop | Catch empty recordings |

---

## Detailed Implementation

### Change 1: Add 'stopping' Camera State

**Line 25:**
```typescript
// BEFORE
type CameraState = 'idle' | 'initializing' | 'recording';

// AFTER
type CameraState = 'idle' | 'initializing' | 'recording' | 'stopping';
```

### Change 2: Reorder MIME Types (VP8 First)

**Lines 31-38:**
```typescript
const getSupportedMimeType = (): string => {
  const mimeTypes = [
    'video/webm;codecs=vp8,opus',  // VP8 first - more stable
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',  // Safari fallback
  ];
  // ... rest unchanged
};
```

### Change 3: Refactor stopRecording() - Remove ALL Cleanup

**Lines 378-407 → Replace entire function:**
```typescript
const stopRecording = useCallback(() => {
  console.log('[VideoUploader] 1. stopRecording called');
  
  // Only stop the recorder - DO NOT cleanup here
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    console.log('[VideoUploader] 2. Requesting final data...');
    mediaRecorderRef.current.requestData();
    mediaRecorderRef.current.stop();
    console.log('[VideoUploader] 3. stop() called, waiting for onstop...');
  }
  
  // Clear timer (safe to do here - doesn't affect recording)
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  
  // Set stopping state to show "Finalizing..." UI
  setCameraState('stopping');
  
  // ✅ NO cleanup here! Let onstop handle it after blob is created
}, []);
```

### Change 4: Refactor mediaRecorder.onstop - Add ALL Cleanup

**Lines 313-341 → Replace onstop handler:**
```typescript
mediaRecorder.onstop = () => {
  console.log('[VideoUploader] 4. onstop fired');
  
  // Calculate total size
  const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
  console.log('[VideoUploader] Total recorded size:', totalSize, 'bytes');
  
  // Validate minimum size (10KB minimum for a valid recording)
  if (totalSize < 10000) {
    console.error('[VideoUploader] Recording too small:', totalSize);
    toast.error('Recording failed - please try again');
    
    // Cleanup and return to idle
    performCleanup();
    setCameraState('idle');
    return;
  }
  
  // Create blob with BASE MIME type (strip codec params)
  const fullMimeType = mimeTypeRef.current || 'video/webm';
  const baseMimeType = fullMimeType.split(';')[0].trim();
  const extension = getFileExtension(fullMimeType);
  
  const blob = new Blob(chunksRef.current, { type: baseMimeType });
  const file = new File([blob], `recording_${Date.now()}.${extension}`, {
    type: baseMimeType,
  });
  
  console.log('[VideoUploader] 5. File created:', {
    name: file.name,
    size: file.size,
    type: file.type
  });
  
  // Pass file to handler
  handleFileSelect(file);
  
  // ✅ NOW cleanup - AFTER file is created
  console.log('[VideoUploader] 6. Cleaning up stream and video element');
  performCleanup();
  
  setCameraState('idle');
};
```

### Change 5: Add Cleanup Helper Function

**Add new function after line 436 (after cancelRecording):**
```typescript
// Shared cleanup function - called ONLY from onstop or cancelRecording
const performCleanup = useCallback(() => {
  // Stop all tracks
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => {
      console.log('[VideoUploader] Stopping track:', track.kind);
      track.stop();
    });
    streamRef.current = null;
  }
  
  // Clear video element
  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
  
  // Clear chunks
  chunksRef.current = [];
}, []);
```

### Change 6: Update cancelRecording to Use performCleanup

**Lines 409-437 → Refactor:**
```typescript
const cancelRecording = useCallback(() => {
  console.log('[VideoUploader] cancelRecording called');
  
  // Clear chunks so onstop doesn't process them
  chunksRef.current = [];
  
  // Stop recorder if active
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
    mediaRecorderRef.current.stop();
  }
  
  // Clear timer
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  
  // Cleanup immediately (user explicitly cancelled)
  performCleanup();
  
  setCameraState('idle');
}, [performCleanup]);
```

### Change 7: Update UI for 'stopping' State

**Line 457 → Update showCameraUI:**
```typescript
// BEFORE
const showCameraUI = cameraState === 'initializing' || cameraState === 'recording';

// AFTER
const showCameraUI = cameraState === 'initializing' || cameraState === 'recording' || cameraState === 'stopping';
```

**Lines 492-506 → Add stopping overlay (after recording overlay):**
```typescript
{/* Stopping/Finalizing overlay */}
{cameraState === 'stopping' && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
    <div className="text-center text-white">
      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
      <p className="text-lg font-medium">Finalizing recording...</p>
      <p className="text-sm text-white/70 mt-1">Please wait</p>
    </div>
  </div>
)}
```

**Lines 510-532 → Hide controls during stopping:**
```typescript
{/* Controls - hide during stopping */}
<div className="flex justify-center gap-3 mt-4">
  {cameraState === 'initializing' && (
    // ... existing Cancel button
  )}
  
  {cameraState === 'recording' && (
    // ... existing Stop Recording button
  )}
  
  {cameraState === 'stopping' && (
    <p className="text-sm text-muted-foreground">Processing...</p>
  )}
</div>
```

---

## Verification Checklist

After implementation, the console should show this exact order:
```text
1. stopRecording called
2. Requesting final data...
3. stop() called, waiting for onstop...
4. onstop fired
5. File created: { name: "recording_xxx.webm", size: 683000, type: "video/webm" }
6. Cleaning up stream and video element
```

If cleanup logs appear between steps 3 and 4, the bug still exists.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/creators/VideoUploader.tsx` | All changes above |

---

## Expected Outcome

After this fix:
- Camera preview shows live feed during recording (no black screen)
- Recorded file contains valid video and audio data
- Playback works correctly with both video and sound
- "Finalizing..." UI shows while MediaRecorder processes
- VP8 codec used by default for better stability
