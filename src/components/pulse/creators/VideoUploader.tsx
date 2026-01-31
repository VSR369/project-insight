/**
 * Video Uploader Component - FIXED GESTURE CONTEXT VERSION
 * 
 * CRITICAL FIX: getUserMedia() is now called DIRECTLY in startRecording() click handler
 * to satisfy browser security requirements for user gesture context.
 * 
 * Previous issue: getUserMedia was called via useEffect + requestAnimationFrame,
 * which broke the gesture context chain and caused permission failures on strict browsers.
 * 
 * This matches the working pattern from AudioRecorder.tsx where getUserMedia
 * is called directly in the button click handler.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Video, Camera, X, StopCircle, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { validateFile, MEDIA_LIMITS, formatBytes } from '@/lib/validations/media';
import { toast } from 'sonner';
import { CameraSelector } from './CameraSelector';
import { MicrophoneSelector } from './MicrophoneSelector';
import { getPreferredDevice as getPreferredMicDevice } from './audioUtils';
import {
  getSupportedVideoMimeType,
  getVideoFileExtension,
  getBaseMimeType,
  getCameraErrorMessage,
  validateRecordedVideo,
  getPreferredFacingMode,
  checkPreviewNotBlack,
} from './videoUtils';

interface VideoUploaderProps {
  videoFile: File | null;
  onVideoChange: (file: File | null) => void;
  onCoverExtracted?: (blob: Blob) => void;
  disabled?: boolean;
}

type CameraState = 'idle' | 'initializing' | 'recording' | 'stopping';

export function VideoUploader({ 
  videoFile, 
  onVideoChange, 
  onCoverExtracted,
  disabled 
}: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showCameraSettings, setShowCameraSettings] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('');
  const recordingTimeRef = useRef<number>(0); // Ref to prevent stale closure

  const MAX_DURATION_SECONDS = 180;

  // Load saved preferences on mount
  useEffect(() => {
    setFacingMode(getPreferredFacingMode());
    setSelectedMicDeviceId(getPreferredMicDevice());
  }, []);

  // Sync recordingTime to ref
  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  // Handle file validation and selection
  const handleFileSelect = useCallback(async (file: File) => {
    console.log('[VideoUploader] handleFileSelect called:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (file.size === 0) {
      toast.error('Recording failed - empty file. Please try again.');
      console.error('[VideoUploader] Empty file received');
      return;
    }

    const validation = validateFile(file, 'reel');
    if (!validation.valid) {
      toast.error(validation.error);
      console.error('[VideoUploader] Validation failed:', validation.error);
      return;
    }

    const duration = await getVideoDuration(file);
    if (duration > MAX_DURATION_SECONDS) {
      toast.error(`Video must be under ${MAX_DURATION_SECONDS / 60} minutes`);
      return;
    }

    onVideoChange(file);

    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    setIsExtracting(true);
    try {
      const cover = await extractVideoThumbnail(file);
      if (cover && onCoverExtracted) {
        onCoverExtracted(cover);
      }
    } catch (error) {
      console.warn('[VideoUploader] Could not extract cover image:', error);
    } finally {
      setIsExtracting(false);
    }
  }, [onVideoChange, onCoverExtracted]);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const duration = isFinite(video.duration) ? video.duration : 0;
        resolve(duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const extractVideoThumbnail = (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(video.src);
            resolve(blob);
          }, 'image/jpeg', 0.8);
        } else {
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
      video.load();
    });
  };

  // Cleanup helper
  const cleanupCamera = useCallback(() => {
    console.log('[VideoUploader] Cleaning up camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('[VideoUploader] Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clean up programmatic video element
    if (videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
    videoRef.current = null;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }, []);

  // Handle camera device selection
  const handleCameraSelect = useCallback((deviceId: string | null, mode: 'user' | 'environment') => {
    setSelectedDeviceId(deviceId);
    setFacingMode(mode);
  }, []);

  /**
   * CRITICAL FIX: Start recording with getUserMedia called DIRECTLY in click handler
   * This maintains the user gesture context required by browser security policies.
   */
  const startRecording = useCallback(async () => {
    console.log('[VideoUploader] startRecording called - DIRECT initialization');
    
    // Set state immediately for UI feedback
    setCameraState('initializing');
    
    if (!videoContainerRef.current) {
      console.error('[VideoUploader] Video container not found!');
      toast.error('Camera initialization failed. Please try again.');
      setCameraState('idle');
      return;
    }
    
    try {
      // Build constraints based on device selection or facing mode
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
      
      if (selectedDeviceId) {
        videoConstraints.deviceId = { exact: selectedDeviceId };
      } else {
        videoConstraints.facingMode = facingMode;
      }

      // ================================================================
      // Build audio constraints (same pattern as working AudioRecorder)
      // ================================================================
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      
      if (selectedMicDeviceId) {
        audioConstraints.deviceId = { exact: selectedMicDeviceId };
        console.log('[VideoUploader] Using selected microphone:', selectedMicDeviceId);
      }

      // ================================================================
      // CRITICAL: getUserMedia called DIRECTLY in click handler context
      // This is the key fix - no useEffect, no requestAnimationFrame!
      // ================================================================
      let stream: MediaStream;
      try {
        console.log('[VideoUploader] Requesting camera with constraints:', videoConstraints);
        console.log('[VideoUploader] Requesting audio with constraints:', audioConstraints);
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });
      } catch (constraintError) {
        console.warn('[VideoUploader] Preferred constraints failed, trying fallback:', constraintError);
        // Fallback to basic constraints but keep audio processing
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
      
      streamRef.current = stream;
      console.log('[VideoUploader] Got media stream:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`));

      // Activate video track explicitly (Edge compatibility)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = true;
        console.log('[VideoUploader] Video track:', {
          label: videoTrack.label,
          readyState: videoTrack.readyState,
          enabled: videoTrack.enabled,
        });
      }
      
      // Activate audio track explicitly (Edge compatibility - CRITICAL for audio capture)
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        console.log('[VideoUploader] Audio track:', {
          label: audioTrack.label,
          readyState: audioTrack.readyState,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
        });
      } else {
        console.warn('[VideoUploader] No audio track in stream!');
        toast.warning('No microphone detected. Video will record without audio.');
      }

      // Create video element PROGRAMMATICALLY
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      
      // Add to DOM BEFORE attaching stream
      videoContainerRef.current.innerHTML = '';
      videoContainerRef.current.appendChild(video);
      videoRef.current = video;
      
      // Attach stream
      video.srcObject = stream;
      console.log('[VideoUploader] Stream attached to video element');
      
      // Wait for video to have ACTUAL FRAMES
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video frame timeout - camera may not be working'));
        }, 10000);
        
        const checkFrames = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            clearTimeout(timeoutId);
            console.log('[VideoUploader] Video has frames:', video.videoWidth, 'x', video.videoHeight);
            resolve();
          } else {
            requestAnimationFrame(checkFrames);
          }
        };
        
        video.play()
          .then(() => {
            console.log('[VideoUploader] Video playing, waiting for frames...');
            checkFrames();
          })
          .catch(reject);
      });
      
      // Stabilization delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ================================================================
      // PRE-RECORDING CHECK: Ensure camera preview is not black
      // Catches physical camera covers, wrong device, etc. BEFORE recording
      // ================================================================
      const previewCheck = checkPreviewNotBlack(video);
      console.log('[VideoUploader] Preview brightness check:', previewCheck.avgBrightness);
      
      if (!previewCheck.isValid) {
        toast.error('Camera preview appears black. Check your camera cover or select a different camera.');
        cleanupCamera();
        setCameraState('idle');
        setShowCameraSettings(true);
        return;
      }
      
      console.log('[VideoUploader] Frames stable, preview valid, starting MediaRecorder');
      
      // Create MediaRecorder
      const mimeType = getSupportedVideoMimeType();
      mimeTypeRef.current = mimeType;
      
      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 2500000,
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Data handler with 500ms interval for stability
      mediaRecorder.ondataavailable = (e) => {
        console.log('[VideoUploader] Chunk received:', e.data.size, 'bytes');
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Stop handler - uses ref to prevent stale closure
      mediaRecorder.onstop = async () => {
        console.log('[VideoUploader] MediaRecorder.onstop fired');
        
        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('[VideoUploader] Total recorded:', chunksRef.current.length, 'chunks,', totalSize, 'bytes');
        
        const fullMimeType = mimeTypeRef.current || 'video/webm';
        const baseMimeType = getBaseMimeType(fullMimeType);
        const extension = getVideoFileExtension(fullMimeType);
        
        console.log('[VideoUploader] Creating blob with type:', baseMimeType);
        
        const blob = new Blob(chunksRef.current, { type: baseMimeType });
        
        // Validate recording before accepting
        const validation = await validateRecordedVideo(blob);
        if (!validation.isValid) {
          console.error('[VideoUploader] Recording validation failed:', validation.error);
          toast.error(validation.error || 'Recording failed - please try again');
          cleanupCamera();
          setCameraState('idle');
          return;
        }
        
        const file = new File([blob], `recording_${Date.now()}.${extension}`, {
          type: baseMimeType,
        });
        
        console.log('[VideoUploader] File created:', file.name, file.size, 'bytes');
        
        handleFileSelect(file);
        cleanupCamera();
        setCameraState('idle');
      };

      mediaRecorder.onerror = (event) => {
        console.error('[VideoUploader] MediaRecorder error:', event);
        toast.error('Recording failed. Please try again.');
        cleanupCamera();
        setCameraState('idle');
      };

      // Start recording with 500ms chunks for stability
      mediaRecorder.start(500);
      console.log('[VideoUploader] Recording started');
      
      setCameraState('recording');
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          recordingTimeRef.current = newTime;
          if (newTime >= MAX_DURATION_SECONDS) {
            // Use ref-based stop to avoid stale closure
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.requestData();
              mediaRecorderRef.current.stop();
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              setCameraState('stopping');
            }
          }
          return newTime;
        });
      }, 1000);

    } catch (error) {
      const errorMessage = getCameraErrorMessage(error);
      toast.error(errorMessage);
      console.error('[VideoUploader] Camera error:', error);
      cleanupCamera();
      setCameraState('idle');
      // Show camera settings on error
      setShowCameraSettings(true);
    }
  }, [selectedDeviceId, selectedMicDeviceId, facingMode, handleFileSelect, cleanupCamera]);

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('[VideoUploader] stopRecording called');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[VideoUploader] Requesting final data and stopping...');
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      setCameraState('stopping');
    }
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    console.log('[VideoUploader] cancelRecording called');
    chunksRef.current = [];
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    cleanupCamera();
    setCameraState('idle');
  }, [cleanupCamera]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    onVideoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // UI state flags
  const showCameraUI = cameraState === 'initializing' || cameraState === 'recording' || cameraState === 'stopping';
  const showPreview = videoFile && videoPreviewUrl && cameraState === 'idle';
  const showUploadZone = cameraState === 'idle' && !videoFile;

  return (
    <div className="space-y-3">
      {/* Camera Container */}
      <div 
        className={showCameraUI ? '' : 'invisible absolute -left-[9999px]'}
        style={{ height: showCameraUI ? 'auto' : 0, overflow: 'hidden' }}
      >
        <Card className={`border-2 ${cameraState === 'recording' ? 'border-destructive' : 'border-primary'}`}>
          <CardContent className="p-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {/* Container for programmatic video element */}
              <div 
                ref={videoContainerRef}
                className="w-full h-full"
              />
              
              {/* Camera selector overlay - only show during recording */}
              {cameraState === 'recording' && (
                <div className="absolute top-3 right-3">
                  <CameraSelector
                    compact
                    onDeviceSelect={handleCameraSelect}
                    disabled={true}
                  />
                </div>
              )}
              
              {/* Initializing overlay */}
              {cameraState === 'initializing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium">Initializing camera...</p>
                    <p className="text-sm text-white/70 mt-1">Please allow camera access if prompted</p>
                  </div>
                </div>
              )}
              
              {/* Recording overlay */}
              {cameraState === 'recording' && (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm">
                    <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
                    REC {formatTime(recordingTime)}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <Progress 
                      value={(recordingTime / MAX_DURATION_SECONDS) * 100} 
                      className="h-1"
                    />
                  </div>
                </>
              )}
              
              {/* Stopping overlay */}
              {cameraState === 'stopping' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium">Finalizing recording...</p>
                    <p className="text-sm text-white/70 mt-1">Validating video quality</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex justify-center gap-3 mt-4">
              {cameraState === 'initializing' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelRecording}
                >
                  Cancel
                </Button>
              )}
              
              {cameraState === 'recording' && (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={stopRecording}
                >
                  <StopCircle className="h-5 w-5 mr-2" />
                  Stop Recording
                </Button>
              )}
              
              {cameraState === 'stopping' && (
                <p className="text-sm text-muted-foreground">Processing...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview - Video file selected */}
      {showPreview && (
        <Card className="border-2 border-primary">
          <CardContent className="p-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={videoPreviewUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearVideo}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
              {isExtracting && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                {videoFile.name}
              </span>
              <span>{formatBytes(videoFile.size)}</span>
            </div>
            {/* Audio hint */}
            <p className="text-xs text-muted-foreground mt-2 text-center">
              🔊 Click the video and use speaker icon to hear audio
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload Zone - Idle state, no file */}
      {showUploadZone && (
        <>
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-1">Upload Video</p>
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                MP4, MOV, WebM • Max {MEDIA_LIMITS.reel.label} • Max 3 minutes
              </p>
            </CardContent>
          </Card>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Camera controls row */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={startRecording}
              disabled={disabled}
            >
              <Camera className="h-4 w-4 mr-2" />
              Record with Camera
            </Button>
            
            {/* Camera settings button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowCameraSettings(!showCameraSettings)}
              title="Camera settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Camera and Microphone selectors (shown on toggle or after error) */}
          {showCameraSettings && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Camera:</span>
                <CameraSelector
                  onDeviceSelect={handleCameraSelect}
                  disabled={disabled}
                />
              </div>
              <MicrophoneSelector
                onDeviceChange={setSelectedMicDeviceId}
                className="pt-2 border-t border-border"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
