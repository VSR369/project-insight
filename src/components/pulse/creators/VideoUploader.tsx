/**
 * Video Uploader Component
 * Drag/drop upload and webcam recording for reels
 * 
 * CRITICAL FIX: Uses deferred initialization pattern to prevent React timing bug.
 * The video element is ALWAYS mounted (hidden when not in use) so videoRef.current
 * is always valid. Camera initialization happens via useEffect AFTER render completes.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Video, Camera, X, StopCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { validateFile, MEDIA_LIMITS, formatBytes } from '@/lib/validations/media';
import { toast } from 'sonner';

interface VideoUploaderProps {
  videoFile: File | null;
  onVideoChange: (file: File | null) => void;
  onCoverExtracted?: (blob: Blob) => void;
  disabled?: boolean;
}

type CameraState = 'idle' | 'initializing' | 'recording' | 'stopping';

/**
 * Detect the best supported mimeType for MediaRecorder
 * VP8 is prioritized for better stability across browsers
 */
const getSupportedMimeType = (): string => {
  const mimeTypes = [
    'video/webm;codecs=vp8,opus',  // VP8 first - more stable
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',  // Safari fallback
  ];
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      console.log('[VideoUploader] Using mimeType:', mimeType);
      return mimeType;
    }
  }
  
  console.warn('[VideoUploader] No preferred mimeType supported, using browser default');
  return '';
};

/**
 * Get file extension based on mimeType
 */
const getFileExtension = (mimeType: string): string => {
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
};

/**
 * Handle camera errors with user-friendly messages
 */
const handleCameraError = (error: unknown) => {
  const err = error as Error;
  
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    toast.error('Camera permission denied. Please allow camera access in your browser settings.');
  } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    toast.error('No camera found. Please connect a camera and try again.');
  } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    toast.error('Camera is in use by another application. Please close other apps using the camera.');
  } else if (err.name === 'OverconstrainedError') {
    toast.error('Camera does not support required settings. Please try again.');
  } else if (err.message?.includes('timeout')) {
    toast.error('Camera took too long to respond. Please try again.');
  } else {
    toast.error(`Could not access camera: ${err.message || 'Unknown error'}`);
  }
  
  console.error('[VideoUploader] Camera error:', error);
};

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

  // Refs - these persist across renders
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('');
  
  // Flag to track if we need to initialize camera after render
  const pendingCameraInit = useRef<boolean>(false);

  const MAX_DURATION_SECONDS = 180; // 3 minutes

  // Handle file validation and selection
  const handleFileSelect = useCallback(async (file: File) => {
    console.log('[VideoUploader] handleFileSelect called:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check for empty file
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

    // Check video duration
    const duration = await getVideoDuration(file);
    if (duration > MAX_DURATION_SECONDS) {
      toast.error(`Video must be under ${MAX_DURATION_SECONDS / 60} minutes`);
      return;
    }

    // Set the file
    onVideoChange(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    // Extract cover image
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

  // Get video duration
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

  // Extract thumbnail from video
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

  // Cleanup helper - used by initializeCamera, cancelRecording, and onstop
  const cleanupCamera = useCallback(() => {
    console.log('[VideoUploader] Cleaning up camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('[VideoUploader] Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }, []);

  // Initialize camera - called by useEffect AFTER video element is mounted
  const initializeCamera = useCallback(async () => {
    console.log('[VideoUploader] initializeCamera starting...');
    
    // Double-check video element is available
    if (!videoRef.current) {
      console.error('[VideoUploader] Video element not found!');
      toast.error('Camera initialization failed. Please try again.');
      setCameraState('idle');
      return;
    }
    
    try {
      // Step 1: Request camera with fallback constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true,
        });
      } catch (constraintError) {
        console.warn('[VideoUploader] Preferred constraints failed, using defaults:', constraintError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }
      
      streamRef.current = stream;
      console.log('[VideoUploader] Got media stream:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`));

      // Step 2: Attach stream to video element
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true; // Prevent audio feedback
      
      console.log('[VideoUploader] Stream attached to video element');
      
      // Step 3: Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 5000);
        
        const handleLoadedMetadata = () => {
          clearTimeout(timeoutId);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          console.log('[VideoUploader] Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
          
          video.play()
            .then(() => {
              console.log('[VideoUploader] Video playing successfully');
              resolve();
            })
            .catch((playError) => {
              console.error('[VideoUploader] Video play failed:', playError);
              reject(playError);
            });
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // If metadata already loaded
        if (video.readyState >= 1) {
          clearTimeout(timeoutId);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.play()
            .then(() => {
              console.log('[VideoUploader] Video already ready, playing');
              resolve();
            })
            .catch(reject);
        }
      });
      
      // Step 4: Create MediaRecorder
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      
      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 2500000, // 2.5 Mbps for better quality
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Data handler
      mediaRecorder.ondataavailable = (e) => {
        console.log('[VideoUploader] Chunk received:', e.data.size, 'bytes');
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Stop handler - CRITICAL: cleanup happens here AFTER blob is created
      mediaRecorder.onstop = () => {
        console.log('[VideoUploader] MediaRecorder.onstop fired');
        
        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('[VideoUploader] Total recorded:', chunksRef.current.length, 'chunks,', totalSize, 'bytes');
        
        // Validate minimum size (10KB minimum for a valid recording)
        if (totalSize < 10000) {
          console.error('[VideoUploader] Recording too small:', totalSize);
          toast.error('Recording failed - please try again');
          cleanupCamera();
          setCameraState('idle');
          return;
        }
        
        // Create blob with BASE MIME type (strip codec params)
        const fullMimeType = mimeTypeRef.current || 'video/webm';
        const baseMimeType = fullMimeType.split(';')[0].trim();
        const extension = getFileExtension(fullMimeType);
        
        console.log('[VideoUploader] Creating blob with type:', baseMimeType);
        
        const blob = new Blob(chunksRef.current, { type: baseMimeType });
        const file = new File([blob], `recording_${Date.now()}.${extension}`, {
          type: baseMimeType,
        });
        
        console.log('[VideoUploader] File created:', file.name, file.size, 'bytes');
        
        // Pass file to handler
        handleFileSelect(file);
        
        // NOW cleanup - AFTER file is created
        cleanupCamera();
        setCameraState('idle');
      };

      mediaRecorder.onerror = (event) => {
        console.error('[VideoUploader] MediaRecorder error:', event);
        toast.error('Recording failed. Please try again.');
        cleanupCamera();
        setCameraState('idle');
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      console.log('[VideoUploader] Recording started');
      
      setCameraState('recording');
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_DURATION_SECONDS - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      handleCameraError(error);
      cleanupCamera();
      setCameraState('idle');
    }
  }, [handleFileSelect, cleanupCamera]);

  // Handle camera initialization AFTER state change and DOM update
  useEffect(() => {
    if (pendingCameraInit.current && cameraState === 'initializing') {
      pendingCameraInit.current = false;
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        initializeCamera();
      });
    }
  }, [cameraState, initializeCamera]);

  // Start recording - sets state and schedules camera init
  const startRecording = useCallback(() => {
    console.log('[VideoUploader] startRecording called - scheduling initialization');
    pendingCameraInit.current = true;
    setCameraState('initializing');
    // Camera will be initialized by useEffect after this render completes
  }, []);

  // Stop recording - signals stop, lets onstop handle cleanup
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
      // onstop handler will do the rest
    }
  }, []);

  // Cancel recording - cleanup without saving
  const cancelRecording = useCallback(() => {
    console.log('[VideoUploader] cancelRecording called');
    
    // Clear chunks so onstop doesn't process them
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
      {/* Camera Container - Always mounted, visibility controlled by CSS */}
      <div className={showCameraUI ? '' : 'hidden'}>
        <Card className={`border-2 ${cameraState === 'recording' ? 'border-destructive' : 'border-primary'}`}>
          <CardContent className="p-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {/* ALWAYS MOUNTED video element - visibility controlled by parent div */}
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="w-full h-full object-cover"
              />
              
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
              
              {/* Stopping/Finalizing overlay */}
              {cameraState === 'stopping' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium">Finalizing recording...</p>
                    <p className="text-sm text-white/70 mt-1">Please wait</p>
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

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={startRecording}
            disabled={disabled}
          >
            <Camera className="h-4 w-4 mr-2" />
            Record with Camera
          </Button>
        </>
      )}
    </div>
  );
}
