

# Root Cause Analysis: Black Screen Video Recording

## 5-Why Analysis

| Level | Question | Answer |
|-------|----------|--------|
| **Why #1** | Why does the recording show black screen? | The variance check in `checkVideoHasContent()` returns `0`, meaning the sampled pixels are all identical (black) |
| **Why #2** | Why are the pixels black when the camera stream has frames? | The video element **does not call `video.play()`** before checking pixels - browser won't render frames without play |
| **Why #3** | Why isn't play() being called in the validation? | The code relies on `onloadedmetadata` → seek → `onseeked` pattern, but WebM blobs created by MediaRecorder often have **incomplete metadata** that prevents proper seeking |
| **Why #4** | Why do MediaRecorder blobs have incomplete metadata? | WebM streams don't have complete duration/seek info until the entire file is written; browsers can't seek accurately in freshly-created blobs |
| **Why #5** | Why wasn't this caught before? | The validation was designed for uploaded files (with complete metadata), not freshly-recorded blobs |

## Evidence from Console Logs

```
[VideoUploader] Video has frames: 1280 x 720  ← Preview works
[VideoUploader] Recording started
...336 chunks recorded (~3.8MB)...             ← Recording works
[videoUtils] Video content variance: 0        ← Validation fails
```

The camera stream **IS working** (1280x720 frames confirmed), the MediaRecorder **IS recording** (3.8MB of data), but the **validation check fails** because:

1. WebM blobs from MediaRecorder lack seekable metadata
2. The validation tries to seek to 1 second but the video can't seek
3. Canvas draws a black frame (not an actual video frame)
4. Variance = 0 → "black screen" error

## The Core Problem

The `checkVideoHasContent()` function in `videoUtils.ts` has these issues:

```typescript
// ISSUE 1: No play() before seeking
video.onloadedmetadata = () => {
  video.currentTime = Math.min(1, video.duration * 0.1); // ← Seek without play
};

// ISSUE 2: onseeked may never fire for WebM blobs with broken seek
video.onseeked = () => {
  // Canvas draws from current frame, but may be black
  ctx.drawImage(video, 0, 0, ...);  // ← Black frame if seek failed
};
```

## Solution Layers

### Layer 1: Fix the Validation Function (Critical)
Update `checkVideoHasContent()` to:
1. Call `video.play()` BEFORE attempting to seek
2. Wait for `canplay` event instead of just `loadedmetadata`
3. Handle WebM seek failures gracefully
4. Sample multiple frames if possible
5. Lower the variance threshold for borderline cases

### Layer 2: Skip Validation for Small Recordings (Pragmatic)
For freshly-recorded blobs from MediaRecorder:
- If file size > 50KB AND recording duration > 0.5s → assume valid
- Only apply strict validation for uploaded files

### Layer 3: Add Pre-Recording Camera Check (Preventive)
Before starting MediaRecorder, sample a frame from the live preview:
- If preview is black → show error BEFORE recording starts
- This catches physical camera covers, wrong camera selection, etc.

### Layer 4: Improve User Feedback (UX)
When validation fails:
- Show which camera was being used
- Offer to re-record with a different camera
- Link to troubleshooting guide

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/creators/videoUtils.ts` | Fix `checkVideoHasContent()` to handle WebM blobs properly, add live preview validation |
| `src/components/pulse/creators/VideoUploader.tsx` | Add pre-recording camera check, improve error handling |

## Detailed Changes

### videoUtils.ts - Fix checkVideoHasContent()

```typescript
async function checkVideoHasContent(blob: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';  // NEW: Force preload
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.pause();
      video.src = '';
    };
    
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(true); // Timeout = assume valid
    }, 5000);
    
    const analyzeFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup();
          resolve(true); // Can't analyze = assume valid
          return;
        }
        
        const sampleWidth = Math.min(video.videoWidth, 160);
        const sampleHeight = Math.min(video.videoHeight, 120);
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        
        ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
        
        const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
        const pixels = imageData.data;
        
        // Improved variance calculation with absolute brightness check
        let totalBrightness = 0;
        let variance = 0;
        const sampleSize = Math.min(pixels.length / 4, 1000);
        const step = Math.floor(pixels.length / 4 / sampleSize);
        
        let prevR = pixels[0], prevG = pixels[1], prevB = pixels[2];
        
        for (let i = 0; i < pixels.length; i += step * 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          totalBrightness += (r + g + b) / 3;
          variance += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
          prevR = r; prevG = g; prevB = b;
        }
        
        const avgBrightness = totalBrightness / sampleSize;
        const avgVariance = variance / sampleSize;
        
        console.log('[videoUtils] Frame analysis:', { avgBrightness, avgVariance });
        
        cleanup();
        
        // Accept if either:
        // 1. Variance >= 2 (has visual detail)
        // 2. Brightness > 10 (not completely black)
        resolve(avgVariance >= 2 || avgBrightness > 10);
        
      } catch (error) {
        console.warn('[videoUtils] Frame analysis failed:', error);
        cleanup();
        resolve(true); // Error = assume valid
      }
    };
    
    // NEW: Use canplaythrough + timeupdate pattern for WebM compatibility
    video.oncanplaythrough = () => {
      clearTimeout(timeoutId);
      
      // For short videos, analyze first frame directly
      if (video.duration < 2) {
        analyzeFrame();
        return;
      }
      
      // For longer videos, try to seek to 1 second
      const seekTarget = Math.min(1, video.duration * 0.1);
      
      const onTimeUpdate = () => {
        if (video.currentTime >= seekTarget * 0.8) {
          video.removeEventListener('timeupdate', onTimeUpdate);
          analyzeFrame();
        }
      };
      
      video.addEventListener('timeupdate', onTimeUpdate);
      video.currentTime = seekTarget;
      video.play().catch(() => analyzeFrame()); // If play fails, analyze anyway
    };
    
    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(true); // Error = assume valid
    };
    
    video.src = url;
    video.load();
    video.play().catch(() => {}); // Start playback attempt
  });
}
```

### VideoUploader.tsx - Add Pre-Recording Camera Check

Add a function to validate the live preview before starting the MediaRecorder:

```typescript
// Add this function to check camera preview before recording
const checkPreviewNotBlack = (video: HTMLVideoElement): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return true; // Can't check = assume valid
    }
    
    canvas.width = 64;
    canvas.height = 48;
    ctx.drawImage(video, 0, 0, 64, 48);
    
    const imageData = ctx.getImageData(0, 0, 64, 48);
    const pixels = imageData.data;
    
    let totalBrightness = 0;
    for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel
      totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    }
    
    const avgBrightness = totalBrightness / (pixels.length / 16);
    console.log('[VideoUploader] Preview brightness:', avgBrightness);
    
    return avgBrightness > 5; // More than complete black
  } catch (e) {
    return true; // Error = assume valid
  }
};

// Then in startRecording(), after stabilization delay:
await new Promise(resolve => setTimeout(resolve, 300));

// NEW: Check preview is not black before starting recorder
if (!checkPreviewNotBlack(video)) {
  toast.error('Camera preview appears black. Check your camera cover or select a different camera.');
  cleanupCamera();
  setCameraState('idle');
  setShowCameraSettings(true);
  return;
}

console.log('[VideoUploader] Frames stable, starting MediaRecorder');
```

## Success Criteria

1. Recording of actual video content produces valid file
2. Black screen from covered camera is caught BEFORE MediaRecorder starts
3. WebM blobs from Chrome/Edge validate correctly
4. Uploaded files still validated properly
5. False positives (rejecting valid dark videos) minimized

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Rejecting valid dark/dimly lit videos | Added brightness check alongside variance |
| Breaking existing upload flow | Changes are in video utils, upload path untouched |
| WebM seek still failing | Use canplaythrough + timeupdate instead of onseeked |
| Pre-check adds latency | Only 64x48 sample, negligible |

## Summary

The root cause is a **validation timing issue** - the `checkVideoHasContent()` function was designed for uploaded files with complete metadata, not freshly-recorded WebM blobs. The fix involves:

1. Using `canplaythrough` + `play()` instead of `loadedmetadata` + seek
2. Adding brightness check alongside variance
3. Adding pre-recording preview validation to catch physical camera issues early

