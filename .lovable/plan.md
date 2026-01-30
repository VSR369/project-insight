
# Fix: Camera Recording Creates Empty/0-Byte File

## Root Cause Analysis (5-Why)

| Level | Question | Answer |
|-------|----------|--------|
| Why #1 | Why is the recording file empty? | `chunksRef.current` contains no data when MediaRecorder stops |
| Why #2 | Why does MediaRecorder collect no data? | The MediaRecorder is created but the video preview disappears |
| Why #3 | Why does the preview disappear? | React re-renders and the video element changes between states |
| Why #4 | Why does the video element change? | There are TWO separate `<video>` elements with the same `ref={videoRef}` in different render branches |
| **Root Cause** | | When state changes from `idle` → `recording`, the old video element (with the stream attached) is unmounted and a NEW video element is rendered. The stream is lost. |

## Technical Details

**Current Code Structure (Problematic):**
```text
Line 488-548 (idle state):
  <video ref={videoRef} ... className="hidden" />  ← Stream attached HERE

Line 409-445 (recording state):
  <video ref={videoRef} ... />  ← NEW element, NO stream
```

**What Happens:**
1. User clicks "Record with Camera"
2. `startRecording()` runs, attaches stream to `videoRef.current` (hidden video)
3. State changes to `recording` → Component re-renders
4. Hidden video element is UNMOUNTED (React destroys it)
5. New video element is MOUNTED with same `ref`
6. `videoRef.current` now points to NEW element with `srcObject = null`
7. User sees black screen, MediaRecorder may fail to collect data

## Solution

**Move video element OUTSIDE conditional renders so it persists across all states:**

```typescript
export function VideoUploader({ ... }) {
  // ... state and refs ...

  return (
    <>
      {/* PERSISTENT video element - never unmounted */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={
          cameraState === 'recording' || cameraState === 'initializing'
            ? 'w-full h-full object-cover'
            : 'hidden'
        }
      />
      
      {/* Rest of UI based on state */}
      {cameraState === 'initializing' && (
        <Card>...</Card>
      )}
      
      {cameraState === 'recording' && (
        <Card>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {/* Video element is OUTSIDE this card, positioned absolutely or via portal */}
          </div>
        </Card>
      )}
      
      {/* idle/preview states... */}
    </>
  );
}
```

**Alternative (Simpler):** Keep single video element at component root level with conditional visibility, then position it into the card UI using CSS.

## Implementation Plan

### Step 1: Restructure VideoUploader Component

1. Move the video element to component root level (before all conditional returns)
2. Make it a single persistent element that shows/hides based on `cameraState`
3. Use CSS to position it correctly within the recording UI container
4. Use a wrapper `<div>` with the video inside for proper layout

### Step 2: Fix Recording UI Layout

1. Create a container div that the persistent video element can be placed into
2. Use CSS classes to show/hide and style the video based on state

### Step 3: Ensure Stream Reattachment Safety

1. After state change, verify `videoRef.current.srcObject` is still valid
2. Add a check in recording state to reattach if needed

### Step 4: Add Debug Logging

Add console logs to verify:
- MediaRecorder is collecting data (`ondataavailable` called)
- `chunksRef.current` has data when `onstop` fires
- File size is non-zero before passing to `handleFileSelect`

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/creators/VideoUploader.tsx` | Restructure to use single persistent video element |

## Expected Outcome

After this fix:
- Camera preview shows correctly during recording
- MediaRecorder captures all video data
- Recording produces valid video file with proper size
- File saves successfully to Supabase storage
