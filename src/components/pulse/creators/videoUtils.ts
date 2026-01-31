/**
 * Video Recording Utilities
 * 
 * Contains functions for:
 * - MIME type detection for MediaRecorder
 * - Camera device enumeration and preference persistence
 * - Post-recording validation (black screen detection)
 */

// =====================================================
// CONSTANTS
// =====================================================

const STORAGE_KEY_PREFERRED_CAMERA = 'pulse_preferred_camera_deviceId';
const STORAGE_KEY_FACING_MODE = 'pulse_preferred_facing_mode';

const MIN_VALID_RECORDING_SIZE = 50000; // 50KB minimum for valid video

// =====================================================
// MIME TYPE DETECTION
// =====================================================

/**
 * Get the best supported MIME type for video recording
 * Prioritizes VP8 for stability, falls back through options
 */
export function getSupportedVideoMimeType(): string {
  const mimeTypes = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      console.log('[videoUtils] Supported mimeType:', mimeType);
      return mimeType;
    }
  }
  
  console.warn('[videoUtils] No preferred mimeType supported, using browser default');
  return '';
}

/**
 * Get file extension based on MIME type
 */
export function getVideoFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

/**
 * Strip codec parameters from MIME type for blob creation
 */
export function getBaseMimeType(mimeType: string): string {
  return mimeType.split(';')[0].trim() || 'video/webm';
}

// =====================================================
// CAMERA DEVICE MANAGEMENT
// =====================================================

export interface VideoInputDevice {
  deviceId: string;
  label: string;
  isFrontCamera: boolean;
}

/**
 * Enumerate available video input devices (cameras)
 */
export async function getVideoInputDevices(): Promise<VideoInputDevice[]> {
  try {
    // Request permission first to get full device labels
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => {
        // Permission denied, we'll still get device IDs but not labels
      });

    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        isFrontCamera: detectFrontCamera(device.label),
      }));
  } catch (error) {
    console.error('[videoUtils] Failed to enumerate devices:', error);
    return [];
  }
}

/**
 * Detect if a camera is likely a front-facing camera based on label
 */
function detectFrontCamera(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return lowerLabel.includes('front') || 
         lowerLabel.includes('facetime') || 
         lowerLabel.includes('user') ||
         lowerLabel.includes('selfie');
}

/**
 * Save preferred camera device ID to localStorage
 */
export function savePreferredCamera(deviceId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFERRED_CAMERA, deviceId);
  } catch (error) {
    console.warn('[videoUtils] Could not save camera preference:', error);
  }
}

/**
 * Get preferred camera device ID from localStorage
 */
export function getPreferredCamera(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_PREFERRED_CAMERA);
  } catch {
    return null;
  }
}

/**
 * Save preferred facing mode to localStorage
 */
export function savePreferredFacingMode(mode: 'user' | 'environment'): void {
  try {
    localStorage.setItem(STORAGE_KEY_FACING_MODE, mode);
  } catch (error) {
    console.warn('[videoUtils] Could not save facing mode preference:', error);
  }
}

/**
 * Get preferred facing mode from localStorage
 */
export function getPreferredFacingMode(): 'user' | 'environment' {
  try {
    const mode = localStorage.getItem(STORAGE_KEY_FACING_MODE);
    return mode === 'environment' ? 'environment' : 'user';
  } catch {
    return 'user';
  }
}

// =====================================================
// RECORDING VALIDATION
// =====================================================

export interface RecordingValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a recorded video blob
 * Checks for minimum size and attempts to detect black screen recordings
 */
export async function validateRecordedVideo(blob: Blob): Promise<RecordingValidationResult> {
  // Check 1: Minimum file size
  if (blob.size < MIN_VALID_RECORDING_SIZE) {
    return {
      isValid: false,
      error: 'Recording too small - camera may not be working properly',
    };
  }

  // Check 2: Try to validate video has actual content (not all black)
  try {
    const hasContent = await checkVideoHasContent(blob);
    if (!hasContent) {
      return {
        isValid: false,
        error: 'Recording appears to be a black screen. Please check your camera.',
      };
    }
  } catch (error) {
    // If validation fails, log but don't block - better to let user decide
    console.warn('[videoUtils] Content validation failed, allowing anyway:', error);
  }

  return { isValid: true };
}

/**
 * Check if a video blob has actual visual content (not black screen)
 * Samples a frame and checks for pixel variance
 */
async function checkVideoHasContent(blob: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    
    video.muted = true;
    video.playsInline = true;
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = '';
    };
    
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(true); // Timeout = assume valid
    }, 5000);
    
    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% into the video
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    
    video.onseeked = () => {
      clearTimeout(timeoutId);
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup();
          resolve(true); // Can't check = assume valid
          return;
        }
        
        // Sample at reduced resolution for performance
        const sampleWidth = Math.min(video.videoWidth, 160);
        const sampleHeight = Math.min(video.videoHeight, 120);
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        
        ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
        
        const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
        const pixels = imageData.data;
        
        // Check pixel variance - if all pixels are nearly identical, it's likely black/blank
        let variance = 0;
        const sampleSize = Math.min(pixels.length / 4, 1000); // Sample up to 1000 pixels
        const step = Math.floor(pixels.length / 4 / sampleSize);
        
        let prevR = pixels[0];
        let prevG = pixels[1];
        let prevB = pixels[2];
        
        for (let i = 0; i < pixels.length; i += step * 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          variance += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
          prevR = r;
          prevG = g;
          prevB = b;
        }
        
        const avgVariance = variance / sampleSize;
        console.log('[videoUtils] Video content variance:', avgVariance);
        
        cleanup();
        
        // If variance is very low (< 2), likely a black/blank screen
        resolve(avgVariance >= 2);
        
      } catch (error) {
        console.warn('[videoUtils] Frame analysis failed:', error);
        cleanup();
        resolve(true); // Error = assume valid
      }
    };
    
    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(true); // Error = assume valid, let upload proceed
    };
    
    video.src = url;
    video.load();
  });
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Get user-friendly error message for camera errors
 */
export function getCameraErrorMessage(error: unknown): string {
  const err = error as Error;
  
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return 'Camera permission denied. Please allow camera access in your browser settings.';
  }
  
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return 'No camera found. Please connect a camera and try again.';
  }
  
  if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    return 'Camera is in use by another application. Please close other apps using the camera.';
  }
  
  if (err.name === 'OverconstrainedError') {
    return 'Camera does not support required settings. Trying with different settings...';
  }
  
  if (err.message?.includes('timeout')) {
    return 'Camera took too long to respond. Please try again.';
  }
  
  return `Could not access camera: ${err.message || 'Unknown error'}`;
}
