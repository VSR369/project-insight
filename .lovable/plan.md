
<context>
User reports audio recording remains unreliable: sometimes the mic level meter is silent; sometimes it moves but playback is silent. Uploading an MP3 plays fine. Console logs show MediaRecorder chunks are being produced and blobs are non-empty, but the selected track label is suspicious: “Default - Microphone (Sharing Audio)”. This points to (a) wrong input device selected and/or (b) browser codec/playback incompatibility for recorded format on some browsers, and/or (c) a “silent-but-encoded” stream where Opus still produces bytes even when input amplitude is near zero.
We must fix this without breaking existing Pulse functionality, DB schema, or upload flow.
</context>

<what-we-know-now>
1) Playback pipeline works for uploaded audio (MP3). So the UI playback controls + <audio> element path is fundamentally OK.
2) Recording pipeline produces blobs with size (50KB–150KB) and duration is captured. So recording is “technically happening”.
3) The live mic indicator sometimes shows silence. That means at least some runs are receiving near-zero amplitude input.
4) The user says “all browsers”. This strongly suggests we must handle codec support differences (e.g., Safari does not play audio/webm), not only Edge/Windows constraints.
</what-we-know-now>

<5-why-updated-and-fact-checked>
Why #1: Why is playback silent sometimes?
- Either the recording contains mostly silence (wrong device/blocked mic) OR the browser cannot decode/play the recorded codec.

Why #2: Why would a non-empty blob still be silent?
- Opus/WebM containers produce data even for silent audio; “bytes exist” does not prove “sound exists”.

Why #3: Why would the live mic meter show silence while recording?
- Wrong device selected (e.g., virtual/loopback, “sharing audio”), OS privacy gating, or the microphone input level is not routed to the track.

Why #4: Why “all browsers”?
- Different browsers support different MediaRecorder codecs:
  - Chrome/Edge: audio/webm;codecs=opus typically OK
  - Firefox: often prefers audio/ogg;codecs=opus
  - Safari: often requires audio/mp4 (WebM support is limited/nonexistent)

Why #5: Why is this still happening in Lovable preview?
- This is not a Supabase/DB issue. This is client-side capture + codec + device selection + validation. The Lovable platform/iframe is unlikely the primary cause because getUserMedia succeeds and uploads playback works.
</5-why-updated-and-fact-checked>

<root-causes-we-will-address>
A) Codec mismatch across browsers: we always create a .webm file and typically record WebM/Opus. This can fail on Safari and can appear “silent” if the audio element cannot decode it.
B) Wrong microphone device selection: user may be recording from a “virtual” or non-mic input (“Sharing Audio”) even though they believe they’re using the built-in mic.
C) Lack of “proof of sound” validation: we need to detect silence / decode failures immediately after recording and guide user to fix device selection rather than letting a silent file proceed.
</root-causes-we-will-address>

<solution-overview>
We will implement a “fool-proof” approach in layers, keeping existing functionality intact and only adding safer defaults + fallbacks:

Layer 1 (No behavior break, immediate reliability):
1) Browser-aware MIME selection + correct file extension:
   - Choose the best supported type from: audio/webm;codecs=opus, audio/webm, audio/ogg;codecs=opus, audio/mp4, (and final fallback: let browser choose).
   - Create file extension matching selected base MIME (webm/ogg/mp4).
   - This addresses “works in Chrome but not Safari” and “recorded file won’t play” scenarios.

2) Post-record “Decode + RMS (sound) verification”:
   - After MediaRecorder stops, attempt to decode the recorded blob using AudioContext.decodeAudioData (same technique already used in WaveformDisplay).
   - Compute RMS (or average absolute amplitude) over the decoded PCM.
   - If decode fails OR RMS below threshold:
     - Show a clear error: “We couldn’t detect microphone audio. Please select a microphone and try again.”
     - Do not pass the blob to PodcastStudio (so the user doesn’t proceed with a silent recording).
   - This prevents “false success” recordings.

Layer 2 (Still safe, adds user control):
3) Add microphone device selector (optional UI, default hidden unless needed):
   - Enumerate devices (navigator.mediaDevices.enumerateDevices()).
   - Allow user to pick an “audioinput” explicitly.
   - Persist last choice in localStorage (non-sensitive).
   - If our RMS validation fails or the track label contains suspicious text (like “Sharing Audio”), auto-suggest opening the device selector.

Layer 3 (True fallback if MediaRecorder remains unreliable):
4) Optional WAV fallback recorder (only triggered if MediaRecorder decode fails repeatedly):
   - Use AudioContext + MediaStreamAudioSourceNode and collect PCM via AudioWorklet/ScriptProcessor (compat-dependent).
   - Encode WAV client-side (no new dependency required).
   - This is the most “fool-proof” universal playback format; the <audio> element will play WAV widely.
   - We only do this if Layers 1–2 still fail, to avoid complexity for users who already work fine.

We will implement Layers 1–2 first (fast, minimal risk). Only implement Layer 3 if you confirm you need “works even when MediaRecorder codec/device is problematic”.
</solution-overview>

<alignment-with-existing-lovable-system>
- No DB schema changes: recording is still turned into a File and uploaded via existing useUploadPulseMedia; content record via useCreatePulseContent remains unchanged.
- No change to storage bucket or paths.
- No change to Pulse content types, XP, feed behavior.
- We keep AudioRecorder’s current UX (Record/Pause/Stop, timer, level meter).
- We add:
  - safe codec selection,
  - reliable “sound present” validation,
  - optional mic selector UI and local preference storage.
These are additive and do not tamper with existing functional flows.
</alignment-with-existing-lovable-system>

<files-we-will-touch>
1) src/components/pulse/creators/AudioRecorder.tsx
   - Add getSupportedMimeType() helper with prioritized list + base type extraction.
   - Add chosenExtension based on base type.
   - Add optional device selection state + enumerateDevices logic.
   - Add post-stop decode + RMS check; if silent/undecodable show error and reset to idle (and suggest device picker).
   - Improve audio level meter to use time-domain RMS rather than frequency average (more accurate for speech detection).

2) (Optional) src/components/pulse/creators/PodcastStudio.tsx
   - Update handleRecordingComplete to name file with correct extension.
   - No behavioral change besides correct file naming (helps downstream type handling).

We will not touch Supabase hooks, RLS, or upload pipelines.
</files-we-will-touch>

<implementation-details-technical>
A) MIME selection
- Implement:
  - const candidates = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4',''];
  - pick first supported (or empty string to let browser choose).
- Record with MediaRecorder(stream, { mimeType }) only if mimeType is non-empty; otherwise omit mimeType to let browser pick.

B) Accurate mic level measurement
- Switch analyser usage to getByteTimeDomainData and compute RMS:
  - rms = sqrt(sum((x-128)^2)/N)/128; then normalize to 0..100
- This correlates better with “speech present”.

C) Post-record validation
- Decode the blob:
  - arrayBuffer = await blob.arrayBuffer()
  - audioContext.decodeAudioData(arrayBuffer)
- Compute RMS across a slice (or full) of channelData:
  - if rms < threshold (e.g., 0.01) => treat as silent
- If decode fails (common when browser can’t decode that recorded mime):
  - treat as failure and suggest switching format/device.
- On failure:
  - setError with actionable text
  - do not call onRecordingComplete

D) Device selector
- On first open or when validation fails:
  - call enumerateDevices()
  - show dropdown (Radix Select or existing UI select component if present)
- Use selectedDeviceId in getUserMedia constraints deviceId: { exact: selectedDeviceId }
- Add “Refresh device list” button for Windows/Edge changes.

E) Diagnostics (kept minimal, no console spam)
- Keep current logs but add:
  - selected mime type
  - selected deviceId label
  - decode success/failure + measured RMS value
This will let us confirm the fix quickly if you report again.
</implementation-details-technical>

<how-we_will_confirm_it_works>
Success criteria (must pass):
1) When you speak, the live mic meter increases consistently (not stuck at silent).
2) After stopping, the app either:
   - accepts the recording and playback produces sound, OR
   - blocks the recording with a clear “no microphone audio detected” message and prompts device selection.
3) On Safari (if you test), recorded audio plays because we use mp4 when needed or we block undecodable recordings instead of letting them appear “silent”.

Important: Because you reported “all browsers”, we will validate codec support, not only Edge.
</how_we_will_confirm_it_works>

<user-side-checklist (non-code, but important)>
Because OS/device routing can still break mic input, we will also provide in-UI guidance when silent is detected:
- Confirm the chosen device is an actual microphone (not “sharing audio” / virtual).
- Confirm OS mic input level is not 0.
- Confirm no other app is exclusively using the mic.

This is not to shift blame—our code will detect and guide instead of failing silently.
</user-side-checklist>

<rollout-plan>
Phase 1 (implement now):
- MIME selection + proper file extension
- RMS-based meter
- Post-stop decode+RMS validation with clear error messages
- Minimal device picker UI shown only when needed

Phase 2 (only if still failing):
- WAV fallback recorder path
- Optional “Mic Test” step before recording (plays back 2s sample)
</rollout-plan>

<open-questions-resolved>
- Upload playback works: confirms playback UI path OK, the issue is capture/codec/validation.
- “All browsers”: requires codec strategy, not just Edge constraints.
</open-questions-resolved>
