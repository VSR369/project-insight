

# Set Default Working Microphone and Camera for Testing

## Current Implementation

The system already has device persistence via localStorage:
- **Camera**: `pulse_preferred_camera_deviceId` 
- **Microphone**: `pulse_preferred_mic_device`
- **Facing Mode**: `pulse_preferred_facing_mode`

When a user selects a device, it's saved and automatically loaded on next use.

## Problem

When testing fresh (no localStorage), the browser picks "default" device which may not be the intended one.

## Solution: Add Testing Default Fallbacks

We'll add fallback device IDs in the utility functions that get called when no localStorage preference exists. This makes the working devices the default for fresh sessions.

---

## Implementation

### File 1: `src/components/pulse/creators/audioUtils.ts`

Add a testing default for microphone:

```typescript
// Near the top of the file, add testing default constant
const TESTING_DEFAULT_MIC_ID = 'default'; // Use 'default' or paste specific deviceId

// Update getPreferredDevice to use testing default
export function getPreferredDevice(): string | null {
  try {
    const saved = localStorage.getItem(DEVICE_STORAGE_KEY);
    // If nothing saved, return testing default (or null for system default)
    return saved || TESTING_DEFAULT_MIC_ID || null;
  } catch (err) {
    return TESTING_DEFAULT_MIC_ID || null;
  }
}
```

### File 2: `src/components/pulse/creators/videoUtils.ts`

Add a testing default for camera:

```typescript
// Near the top of the file, add testing default constant  
const TESTING_DEFAULT_CAMERA_ID: string | null = null; // Set to specific deviceId if needed

// Update getPreferredCamera to use testing default
export function getPreferredCamera(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREFERRED_CAMERA);
    return saved || TESTING_DEFAULT_CAMERA_ID;
  } catch {
    return TESTING_DEFAULT_CAMERA_ID;
  }
}
```

---

## How to Find Your Device IDs

1. Open browser DevTools Console
2. Run this command to list all devices:
```javascript
navigator.mediaDevices.enumerateDevices().then(devices => {
  devices.forEach(d => console.log(d.kind, d.deviceId, d.label));
});
```
3. Copy the `deviceId` for your working microphone and camera
4. Paste into the `TESTING_DEFAULT_*` constants

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/pulse/creators/audioUtils.ts` | Add `TESTING_DEFAULT_MIC_ID` constant and use in `getPreferredDevice()` |
| `src/components/pulse/creators/videoUtils.ts` | Add `TESTING_DEFAULT_CAMERA_ID` constant and use in `getPreferredCamera()` |

---

## Alternative: Quick localStorage Pre-Set

If you just want to set the defaults once for your testing session, you can paste this in browser console:

```javascript
// Set your known working devices
localStorage.setItem('pulse_preferred_mic_device', 'YOUR_MIC_DEVICE_ID');
localStorage.setItem('pulse_preferred_camera_deviceId', 'YOUR_CAMERA_DEVICE_ID');
localStorage.setItem('pulse_preferred_facing_mode', 'user');

// Refresh to apply
location.reload();
```

This will persist across sessions without code changes.

---

## Recommendation

**For temporary testing**: Use the console localStorage method above - no code changes needed.

**For permanent dev/staging defaults**: I'll add the constants in the code so the system always falls back to known working devices.

Which approach would you prefer?

