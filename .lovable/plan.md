

## Audio Recording Edge Browser Fix - Implementation Plan

### Problem Summary
Audio recording in Edge browser produces silent recordings because the basic `getUserMedia({ audio: true })` doesn't provide sufficient constraints for Edge's stricter security model. The microphone stream is muted at the OS/browser level even when permission is granted.

### Root Cause (5-Why Analysis)
1. Playback is silent → Blob contains no audio data
2. No audio in blob → MediaRecorder receives silent stream  
3. Stream is silent → Track is muted at OS/browser level
4. Track is muted → Edge + Windows have layered privacy controls
5. Why Edge specifically → Basic constraints don't activate microphone properly

### Solution: Minimal Code Changes

Only **3 changes** needed to `src/components/pulse/creators/AudioRecorder.tsx`:

---

#### Change 1: Enhanced Audio Constraints (Critical)

**File:** `src/components/pulse/creators/AudioRecorder.tsx`  
**Location:** Line 177

| Before | After |
|--------|-------|
| `getUserMedia({ audio: true })` | Enhanced constraints with `echoCancellation`, `noiseSuppression`, `autoGainControl` |

**Technical Reason:** Edge requires explicit audio processing constraints to properly activate the microphone through Windows' layered permission system.

---

#### Change 2: Explicitly Enable Track (Critical)

**File:** `src/components/pulse/creators/AudioRecorder.tsx`  
**Location:** After line 184 (after track validation)

Add explicit track enabling to force the track into an active state, even when Edge delivers it in a muted state.

**Technical Reason:** Edge sometimes delivers tracks in a "muted" state even after permission is granted.

---

#### Change 3: More Frequent Data Collection (Optional Optimization)

**File:** `src/components/pulse/creators/AudioRecorder.tsx`  
**Location:** Line 272

| Before | After |
|--------|-------|
| `mediaRecorder.start(1000)` | `mediaRecorder.start(500)` |

**Technical Reason:** Smaller chunks reduce the risk of data loss and improve responsiveness.

---

#### Change 4: Enhanced Error Message for Windows Settings

**File:** `src/components/pulse/creators/AudioRecorder.tsx`  
**Location:** Error handling section (lines 283-291)

Add a new error case with specific guidance for Edge/Windows users about checking Windows microphone privacy settings.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/creators/AudioRecorder.tsx` | 4 small changes: constraints, track enable, data interval, error message |

### What Already Works (No Changes Needed)

The current implementation already has:
- ✅ AudioContext.resume() for suspended context
- ✅ durationRef for closure fix
- ✅ Audio level monitoring with AnalyserNode
- ✅ Proper stream cleanup
- ✅ MIME type detection and normalization
- ✅ Specific error messages per error type

### Testing Verification

After implementation, verify in Edge browser:
1. Console shows: `Track enabled: true`
2. Console shows: `Track muted: false`
3. Audio level indicator shows activity when speaking
4. Data chunks show `> 1000 bytes` per chunk
5. Playback produces audible sound

### Future Enhancement (Phase 2 - Optional)

Add a microphone device selector dropdown for users with multiple audio inputs. This requires:
- Device enumeration via `navigator.mediaDevices.enumerateDevices()`
- Dropdown UI component
- `deviceId: { exact: selectedDeviceId }` in constraints

This is **not required** for the fix but improves UX for power users.

