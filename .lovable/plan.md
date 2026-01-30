

# Fix: AudioRecorder Duration Closure Bug & Missing Stream Tracking

## Root Cause Analysis

### Bug #1: Duration Closure Issue (CRITICAL)
**Current Code (Line 98-106):**
```typescript
mediaRecorder.onstop = () => {
  const audioBlob = new Blob(chunksRef.current, { 
    type: mediaRecorder.mimeType 
  });
  stream.getTracks().forEach(track => track.stop());
  onRecordingComplete(audioBlob, duration);  // ← BUG: `duration` is captured at 0!
};
```

**The Problem:**
When the `onstop` handler is created (during `startRecording`), `duration` is captured with its initial value of `0`. Even though `setDuration(elapsed)` updates the state every second, the `onstop` callback always passes `0` because it captured the stale closure value.

**Timeline:**
```text
[startRecording] → duration = 0 → onstop handler created (captures duration = 0)
                                         ↓
[timer ticks] → setDuration(1), setDuration(2), ... → state updates but closure doesn't
                                         ↓
[stopRecording] → onstop fires → passes duration = 0 to parent (WRONG!)
```

### Bug #2: Missing Stream Reference
**Current Code:**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// stream is local variable - not stored in ref!
```

The stream is only accessible inside `startRecording` and via the closure in `onstop`. The cleanup effect (line 38-47) cannot access it, and `resumeRecording` has no way to verify the stream is still alive.

### Bug #3: No Audio Track Validation
The code doesn't verify the audio track is actually "live" before starting the MediaRecorder. A track could be in "ended" state if the user revoked permission.

### Bug #4: No User Feedback for Microphone Activity
Users have no way to know if their microphone is actually picking up sound. This makes debugging issues very difficult.

---

## Solution Summary

| # | Issue | Fix |
|---|-------|-----|
| 1 | Duration closure bug | Use `durationRef` to track current duration |
| 2 | Missing stream reference | Store stream in `streamRef` |
| 3 | No track validation | Check `audioTrack.readyState === "live"` before recording |
| 4 | No audio feedback | Add audio level meter using AudioContext/AnalyserNode |
| 5 | Weak MIME type detection | Use `audio/webm;codecs=opus` for better quality |
| 6 | Incomplete cleanup | Comprehensive cleanup function |
| 7 | Weak error messages | Specific error messages per error type |

---

## Implementation Changes

### Change 1: Add New State and Refs
```typescript
// Add audio level state for visual feedback
const [audioLevel, setAudioLevel] = useState(0);

// Add missing refs
const streamRef = useRef<MediaStream | null>(null);
const durationRef = useRef<number>(0);
const audioContextRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const animationFrameRef = useRef<number | null>(null);
```

### Change 2: Keep durationRef in Sync
```typescript
// Sync durationRef with duration state
useEffect(() => {
  durationRef.current = duration;
}, [duration]);
```

### Change 3: Add Comprehensive Cleanup Function
```typescript
const cleanup = useCallback(() => {
  // Stop timer
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  
  // Stop animation frame
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }
  
  // Close audio context
  if (audioContextRef.current) {
    audioContextRef.current.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
  }
  
  // Stop media recorder
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
    try { mediaRecorderRef.current.stop(); } catch (e) {}
  }
  mediaRecorderRef.current = null;
  
  // Stop stream tracks
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
  
  setAudioLevel(0);
}, []);
```

### Change 4: Add Audio Level Monitoring
```typescript
const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalized = Math.min(100, (average / 128) * 100);
      setAudioLevel(normalized);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  } catch (e) {
    console.warn("Could not start audio level monitoring:", e);
  }
}, []);
```

### Change 5: Update startRecording with Validation and Better MIME Type
```typescript
const startRecording = async () => {
  try {
    setError(null);
    chunksRef.current = [];
    pausedDurationRef.current = 0;
    setDuration(0);
    durationRef.current = 0;

    console.log("[AudioRecorder] Requesting microphone permission...");
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    
    // Validate audio track
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error("No audio track available");
    }
    
    console.log("[AudioRecorder] Audio track:", {
      label: audioTrack.label,
      readyState: audioTrack.readyState,
    });
    
    if (audioTrack.readyState !== "live") {
      throw new Error("Audio track is not live");
    }
    
    // Start audio level monitoring
    startAudioLevelMonitoring(stream);
    
    // Better MIME type detection
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") 
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm") 
        ? "audio/webm" 
        : "audio/mp4";
    
    console.log("[AudioRecorder] Using mimeType:", mimeType);
    
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    // ... handlers ...
  } catch (err) {
    // Detailed error handling
  }
};
```

### Change 6: Fix onstop Handler to Use durationRef
```typescript
mediaRecorder.onstop = () => {
  console.log("[AudioRecorder] Recording stopped");
  
  const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
  console.log("[AudioRecorder] Total recorded:", totalSize, "bytes");
  
  if (totalSize === 0) {
    setError("Recording failed - no audio data captured");
    cleanup();
    setState("idle");
    return;
  }
  
  // Use BASE mime type (strip codec params)
  const baseMimeType = (mediaRecorder.mimeType || "audio/webm").split(";")[0];
  const audioBlob = new Blob(chunksRef.current, { type: baseMimeType });
  
  // FIX: Use durationRef.current instead of stale closure!
  const finalDuration = durationRef.current;
  console.log("[AudioRecorder] Duration:", finalDuration, "seconds");
  
  // Cleanup
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
  
  if (audioContextRef.current) {
    audioContextRef.current.close().catch(() => {});
    audioContextRef.current = null;
  }
  
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }
  
  setAudioLevel(0);
  
  // Pass correct duration to parent
  onRecordingComplete(audioBlob, finalDuration);
};
```

### Change 7: Update pauseRecording and resumeRecording
```typescript
const pauseRecording = () => {
  if (mediaRecorderRef.current && state === "recording") {
    mediaRecorderRef.current.pause();
    setState("paused");
    stopTimer();
    
    // Pause level monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }
};

const resumeRecording = () => {
  if (mediaRecorderRef.current && state === "paused") {
    mediaRecorderRef.current.resume();
    setState("recording");
    startTimer();
    
    // Resume level monitoring
    if (streamRef.current) {
      startAudioLevelMonitoring(streamRef.current);
    }
  }
};
```

### Change 8: Add Audio Level Indicator to UI
```tsx
{/* Audio Level Indicator - shows during recording */}
{state === "recording" && (
  <div className="flex items-center gap-2 mt-3">
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div 
        className="h-full bg-green-500 transition-all duration-100"
        style={{ width: `${audioLevel}%` }}
      />
    </div>
    <span className="text-xs text-muted-foreground min-w-[180px]">
      {audioLevel > 5 
        ? "🎤 Microphone is picking up sound" 
        : "🔇 No sound detected"}
    </span>
  </div>
)}
```

### Change 9: Better Error Messages
```typescript
} catch (err) {
  const error = err as Error;
  console.error("[AudioRecorder] Error:", error);
  
  if (error.name === "NotAllowedError") {
    setError("Microphone permission denied. Please allow access in browser settings.");
  } else if (error.name === "NotFoundError") {
    setError("No microphone found. Please connect a microphone.");
  } else if (error.name === "NotReadableError") {
    setError("Microphone is in use by another application.");
  } else {
    setError(error.message || "Could not access microphone.");
  }
  
  cleanup();
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/creators/AudioRecorder.tsx` | All changes above |

---

## Expected Console Output

```text
[AudioRecorder] Requesting microphone permission...
[AudioRecorder] Audio track: { label: "Default", readyState: "live" }
[AudioRecorder] Using mimeType: audio/webm;codecs=opus
[AudioRecorder] Chunk received: 4096 bytes
[AudioRecorder] Chunk received: 4096 bytes
... (more chunks) ...
[AudioRecorder] Recording stopped
[AudioRecorder] Total recorded: 45678 bytes
[AudioRecorder] Duration: 10 seconds
```

---

## Testing Checklist

After implementation:
- [ ] Click "Record Now" - mic permission prompt appears
- [ ] Green level meter shows audio activity
- [ ] Timer counts up correctly
- [ ] Click "Pause" - timer stops, level meter stops
- [ ] Click "Resume" - timer continues, level meter resumes
- [ ] Click "Stop" - recording completes
- [ ] Parent receives blob with **correct duration** (not 0)
- [ ] Console shows proper duration value
- [ ] Error messages are clear when permission denied

