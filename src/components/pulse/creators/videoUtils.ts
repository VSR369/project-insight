/**
 * Video Recording Utilities
 * 
 * Contains functions for:
 * - MIME type detection for MediaRecorder
 * - Camera device enumeration and preference persistence
 * - Post-recording validation (black screen detection)
 */

import { logInfo, logWarning } from "@/lib/errorHandler";

// =====================================================
// CONSTANTS
// =====================================================

const STORAGE_KEY_PREFERRED_CAMERA = 'pulse_preferred_camera_deviceId';
const STORAGE_KEY_FACING_MODE = 'pulse_preferred_facing_mode';

// Testing default: Set to specific deviceId for testing, or null for system default
const TESTING_DEFAULT_CAMERA_ID: string | null = null;

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
      logInfo('Video MIME type supported', { operation: 'getSupportedVideoMimeType' }, { mimeType });
      return mimeType;
    }
  }
  
  logWarning('No preferred MIME type supported, using browser default', { operation: 'getSupportedVideoMimeType' });
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
    logWarning('Failed to enumerate camera devices', { operation: 'getVideoInputDevices' }, { error: (error as Error).message });
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
    logWarning('Could not save camera preference', { operation: 'savePreferredCamera' }, { error: (error as Error).message });
  }
}

/**
 * Get preferred camera device ID from localStorage.
 * Falls back to testing default if no preference saved.
 */
export function getPreferredCamera(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREFERRED_CAMERA);
    return saved || TESTING_DEFAULT_CAMERA_ID;
  } catch {
    return TESTING_DEFAULT_CAMERA_ID;
  }
}

/**
 * Save preferred facing mode to localStorage
 */
export function savePreferredFacingMode(mode: 'user' | 'environment'): void {
  try {
    localStorage.setItem(STORAGE_KEY_FACING_MODE, mode);
  } catch (error) {
    logWarning('Could not save facing mode preference', { operation: 'savePreferredFacingMode' }, { error: (error as Error).message });
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
// LIVE PREVIEW VALIDATION
// =====================================================

export interface PreviewCheckResult {
  isValid: boolean;
  avgBrightness: number;
}

/**
 * Check if camera preview is not black BEFORE starting recording
 * This catches physical camera covers, wrong device selection, etc.
 * 
 * @param video - The live video preview element
 * @returns Object with isValid flag and brightness value
 */
export function checkPreviewNotBlack(video: HTMLVideoElement): PreviewCheckResult {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      logInfo('Cannot check preview - no dimensions', { operation: 'checkPreviewNotBlack' });
      return { isValid: true, avgBrightness: -1 }; // Can't check = assume valid
    }
    
    // Small sample for fast check
    canvas.width = 64;
    canvas.height = 48;
    ctx.drawImage(video, 0, 0, 64, 48);
    
    const imageData = ctx.getImageData(0, 0, 64, 48);
    const pixels = imageData.data;
    
    let totalBrightness = 0;
    const sampleCount = pixels.length / 16; // Sample every 4th pixel (RGBA)
    
    for (let i = 0; i < pixels.length; i += 16) {
      totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    }
    
    const avgBrightness = totalBrightness / sampleCount;
    
    // Threshold of 5: anything above complete black is considered valid
    // This allows for very dark scenes while catching covered cameras
    const isValid = avgBrightness > 5;
    
    return { isValid, avgBrightness };
  } catch (e) {
    logWarning('Preview check error', { operation: 'checkPreviewNotBlack' }, { error: (e as Error).message });
    return { isValid: true, avgBrightness: -1 }; // Error = assume valid
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
    logWarning('Content validation failed, allowing anyway', { operation: 'validateRecordedVideo' }, { error: (error as Error).message });
  }

  return { isValid: true };
}

/**
 * Check if a video blob has actual visual content (not black screen)
 * FIXED: Uses canplaythrough + play() pattern for WebM blob compatibility
 * 
 * Previous issue: WebM blobs from MediaRecorder lack complete metadata,
 * causing seek-based validation to fail (canvas draws black frame).
 */
async function checkVideoHasContent(blob: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto'; // Force preload for better WebM handling
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.pause();
      video.src = '';
    };
    
    const timeoutId = setTimeout(() => {
      logInfo('Content check timeout - assuming valid', { operation: 'checkVideoHasContent' });
      cleanup();
      resolve(true); // Timeout = assume valid
    }, 5000);
    
    // Frame analysis function - checks both variance AND brightness
    const analyzeFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
          logInfo('Cannot analyze - no video dimensions', { operation: 'analyzeFrame' });
          cleanup();
          resolve(true); // Can't analyze = assume valid
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
        
        // Improved: Calculate BOTH variance AND absolute brightness
        let totalBrightness = 0;
        let variance = 0;
        const sampleSize = Math.min(pixels.length / 4, 1000);
        const step = Math.floor(pixels.length / 4 / sampleSize);
        
        let prevR = pixels[0];
        let prevG = pixels[1];
        let prevB = pixels[2];
        
        for (let i = 0; i < pixels.length; i += step * 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          totalBrightness += (r + g + b) / 3;
          variance += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
          prevR = r;
          prevG = g;
          prevB = b;
        }
        
        const avgBrightness = totalBrightness / sampleSize;
        const avgVariance = variance / sampleSize;
        
        logInfo('Frame analysis complete', { operation: 'analyzeFrame' }, { avgBrightness, avgVariance, sampleSize });
        
        cleanup();
        
        // Accept if EITHER:
        // 1. Variance >= 2 (has visual detail/edges)
        // 2. Brightness > 10 (not completely black, could be dim scene)
        const isValid = avgVariance >= 2 || avgBrightness > 10;
        logInfo('Content validation result', { operation: 'analyzeFrame' }, { isValid });
        resolve(isValid);
        
      } catch (error) {
        logWarning('Frame analysis failed', { operation: 'analyzeFrame' }, { error: (error as Error).message });
        cleanup();
        resolve(true); // Error = assume valid
      }
    };
    
    // FIXED: Use canplaythrough + play pattern for WebM compatibility
    // Previous pattern (loadedmetadata + seek) fails for MediaRecorder blobs
    video.oncanplaythrough = () => {
      clearTimeout(timeoutId);
      logInfo('Video canplaythrough', { operation: 'checkVideoHasContent' }, { duration: video.duration });
      
      // For short videos or invalid duration, analyze first frame directly
      if (!isFinite(video.duration) || video.duration < 2) {
        logInfo('Short/invalid duration - analyzing current frame', { operation: 'checkVideoHasContent' });
        analyzeFrame();
        return;
      }
      
      // For longer videos, try to get a frame at 1 second
      const seekTarget = Math.min(1, video.duration * 0.1);
      
      const onTimeUpdate = () => {
        if (video.currentTime >= seekTarget * 0.8) {
          video.removeEventListener('timeupdate', onTimeUpdate);
          logInfo('Reached target time for analysis', { operation: 'checkVideoHasContent' }, { currentTime: video.currentTime });
          analyzeFrame();
        }
      };
      
      video.addEventListener('timeupdate', onTimeUpdate);
      video.currentTime = seekTarget;
      
      // Ensure playback starts - if it fails, analyze anyway
      video.play().catch(() => {
        logInfo('Play failed during seek - analyzing current frame', { operation: 'checkVideoHasContent' });
        video.removeEventListener('timeupdate', onTimeUpdate);
        analyzeFrame();
      });
    };
    
    video.onerror = () => {
      clearTimeout(timeoutId);
      logWarning('Video error during validation', { operation: 'checkVideoHasContent' });
      cleanup();
      resolve(true); // Error = assume valid, let upload proceed
    };
    
    video.src = url;
    video.load();
    
    // Start playback attempt immediately (helps with WebM metadata loading)
    video.play().catch(() => {
      logInfo('Initial play attempt failed - waiting for canplaythrough', { operation: 'checkVideoHasContent' });
    });
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