/**
 * Audio Recording Utilities
 * 
 * Provides browser-aware MIME type detection, RMS audio level calculation,
 * and post-recording validation to ensure recordings contain actual audio.
 */

// ============================================================================
// MIME Type Detection
// ============================================================================

interface MimeTypeResult {
  mimeType: string;
  extension: string;
  baseMimeType: string;
}

/**
 * Detects the best supported audio MIME type for MediaRecorder.
 * Prioritizes formats in order of browser compatibility and quality.
 */
export function getSupportedMimeType(): MimeTypeResult {
  const candidates = [
    { mime: 'audio/webm;codecs=opus', ext: 'webm', base: 'audio/webm' },
    { mime: 'audio/webm', ext: 'webm', base: 'audio/webm' },
    { mime: 'audio/ogg;codecs=opus', ext: 'ogg', base: 'audio/ogg' },
    { mime: 'audio/mp4', ext: 'm4a', base: 'audio/mp4' },
    { mime: 'audio/mpeg', ext: 'mp3', base: 'audio/mpeg' },
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mime)) {
      console.log('[AudioUtils] Selected MIME type:', candidate.mime);
      return {
        mimeType: candidate.mime,
        extension: candidate.ext,
        baseMimeType: candidate.base,
      };
    }
  }

  // Fallback: let browser choose
  console.log('[AudioUtils] No preferred MIME type supported, using browser default');
  return {
    mimeType: '',
    extension: 'webm', // Most common default
    baseMimeType: 'audio/webm',
  };
}

// ============================================================================
// RMS Audio Level Calculation
// ============================================================================

/**
 * Calculates RMS (Root Mean Square) from time-domain audio data.
 * More accurate for speech detection than frequency-based measurement.
 * 
 * @param dataArray - Uint8Array from AnalyserNode.getByteTimeDomainData()
 * @returns Normalized RMS value (0-100)
 */
export function calculateRMSFromTimeDomain(dataArray: Uint8Array): number {
  let sumOfSquares = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    // Time-domain data is centered at 128 (silence)
    const normalized = (dataArray[i] - 128) / 128;
    sumOfSquares += normalized * normalized;
  }
  
  const rms = Math.sqrt(sumOfSquares / dataArray.length);
  // Scale to 0-100 (RMS of 0.5 = very loud)
  return Math.min(100, rms * 200);
}

/**
 * Calculates RMS from decoded PCM audio data (Float32Array).
 * Used for post-recording validation.
 * 
 * @param channelData - Float32Array from AudioBuffer.getChannelData()
 * @returns RMS value (0-1 range)
 */
export function calculateRMSFromPCM(channelData: Float32Array): number {
  let sumOfSquares = 0;
  
  // Sample every 100th value for performance on long recordings
  const step = Math.max(1, Math.floor(channelData.length / 10000));
  let sampleCount = 0;
  
  for (let i = 0; i < channelData.length; i += step) {
    sumOfSquares += channelData[i] * channelData[i];
    sampleCount++;
  }
  
  return Math.sqrt(sumOfSquares / sampleCount);
}

// ============================================================================
// Post-Recording Validation
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  rms: number;
  duration: number;
  errorMessage?: string;
  suggestDeviceChange?: boolean;
}

// Threshold below which we consider audio "silent"
// 0.01 RMS is approximately -40dB, very quiet
const SILENCE_THRESHOLD = 0.005;

/**
 * Validates a recorded audio blob by decoding and checking for actual sound.
 * Returns validation result with actionable error messages.
 * 
 * @param blob - The recorded audio blob
 * @returns Promise<ValidationResult>
 */
export async function validateRecordedAudio(blob: Blob): Promise<ValidationResult> {
  console.log('[AudioUtils] Validating recording:', blob.size, 'bytes, type:', blob.type);
  
  // Check minimum size (a few KB minimum for any real audio)
  if (blob.size < 1000) {
    return {
      isValid: false,
      rms: 0,
      duration: 0,
      errorMessage: 'Recording is too small. The microphone may not be working.',
      suggestDeviceChange: true,
    };
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const rms = calculateRMSFromPCM(channelData);
      
      console.log('[AudioUtils] Decoded audio - Duration:', audioBuffer.duration.toFixed(2), 
        's, RMS:', rms.toFixed(4));
      
      audioContext.close();
      
      if (rms < SILENCE_THRESHOLD) {
        return {
          isValid: false,
          rms,
          duration: audioBuffer.duration,
          errorMessage: 'No microphone audio detected. Please check your microphone selection and try again.',
          suggestDeviceChange: true,
        };
      }
      
      return {
        isValid: true,
        rms,
        duration: audioBuffer.duration,
      };
      
    } catch (decodeError) {
      console.error('[AudioUtils] Failed to decode audio:', decodeError);
      audioContext.close();
      
      return {
        isValid: false,
        rms: 0,
        duration: 0,
        errorMessage: 'Could not verify recording. The audio format may not be supported by your browser. Try selecting a different microphone.',
        suggestDeviceChange: true,
      };
    }
    
  } catch (err) {
    console.error('[AudioUtils] Validation error:', err);
    return {
      isValid: false,
      rms: 0,
      duration: 0,
      errorMessage: 'Failed to process recording. Please try again.',
      suggestDeviceChange: false,
    };
  }
}

// ============================================================================
// Device Management
// ============================================================================

const DEVICE_STORAGE_KEY = 'pulse_preferred_mic_device';

// Testing default: Use 'default' for system default, or paste specific deviceId for testing
const TESTING_DEFAULT_MIC_ID: string | null = 'default';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

/**
 * Gets available audio input devices.
 * Note: Labels may be empty if permission hasn't been granted yet.
 */
export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audioinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
      }));
  } catch (err) {
    console.error('[AudioUtils] Failed to enumerate devices:', err);
    return [];
  }
}

/**
 * Saves the preferred microphone device ID to localStorage.
 */
export function savePreferredDevice(deviceId: string): void {
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  } catch (err) {
    // localStorage may be unavailable in some contexts
  }
}

/**
 * Gets the previously saved preferred device ID.
 * Falls back to testing default if no preference saved.
 */
export function getPreferredDevice(): string | null {
  try {
    const saved = localStorage.getItem(DEVICE_STORAGE_KEY);
    return saved || TESTING_DEFAULT_MIC_ID;
  } catch (err) {
    return TESTING_DEFAULT_MIC_ID;
  }
}

/**
 * Checks if a device label suggests it might be a virtual/sharing device
 * rather than a real microphone.
 */
export function isSuspiciousDevice(label: string): boolean {
  const suspiciousPatterns = [
    /sharing audio/i,
    /virtual/i,
    /loopback/i,
    /stereo mix/i,
    /what u hear/i,
    /cable output/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(label));
}
