/**
 * Video Uploader Component
 * Drag/drop upload and webcam recording for reels
 */

import { useState, useRef, useCallback } from 'react';
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

type CameraState = 'idle' | 'initializing' | 'ready' | 'recording';

/**
 * Detect the best supported mimeType for MediaRecorder
 * Handles cross-browser compatibility (Chrome, Firefox, Safari)
 */
const getSupportedMimeType = (): string => {
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',  // Safari fallback
  ];
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      console.log('Using mimeType:', mimeType);
      return mimeType;
    }
  }
  
  // Last resort: let browser choose
  console.warn('No preferred mimeType supported, using browser default');
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
  
  console.error('Camera error:', error);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('');

  const MAX_DURATION_SECONDS = 180; // 3 minutes

  // Handle file validation and selection
  const handleFileSelect = useCallback(async (file: File) => {
    const validation = validateFile(file, 'reel');
    if (!validation.valid) {
      toast.error(validation.error);
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
      console.warn('Could not extract cover image');
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
        resolve(video.duration);
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

  // Webcam recording with robust initialization
  const startRecording = useCallback(async () => {
    setCameraState('initializing');
    
    try {
      // Step 1: Request camera with fallback constraints
      let stream: MediaStream;
      try {
        // Try preferred constraints first (front camera, HD)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true,
        });
      } catch (constraintError) {
        // Fallback: accept any available camera
        console.warn('Preferred camera constraints failed, using defaults:', constraintError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }
      
      streamRef.current = stream;

      // Step 2: Properly attach stream to video element and wait for it to be ready
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        // Wait for video to be ready before playing
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Video load timeout'));
          }, 5000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeoutId);
            video.play()
              .then(() => resolve())
              .catch(reject);
          };
          
          video.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error('Video element error'));
          };
        });
      }
      
      // Step 3: Create MediaRecorder with browser-compatible mimeType
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mimeTypeRef.current || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        const extension = getFileExtension(actualMimeType);
        const file = new File([blob], `recording_${Date.now()}.${extension}`, {
          type: actualMimeType,
        });
        handleFileSelect(file);
        setCameraState('idle');
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording failed. Please try again.');
        stopRecording();
      };

      mediaRecorder.start(1000); // Collect data every second
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
      setCameraState('idle');
      
      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [handleFileSelect]);

  const stopRecording = useCallback(() => {
    // Stop MediaRecorder first
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset video element state
    }
    
    // Note: setCameraState('idle') is handled in mediaRecorder.onstop
  }, []);

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

  // Show initializing UI
  if (cameraState === 'initializing') {
    return (
      <Card className="border-2 border-primary">
        <CardContent className="p-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Initializing camera...</p>
              <p className="text-sm text-white/70 mt-1">Please allow camera access if prompted</p>
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                  streamRef.current = null;
                }
                setCameraState('idle');
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show recording UI
  if (cameraState === 'recording') {
    return (
      <Card className="border-2 border-destructive">
        <CardContent className="p-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="w-full h-full object-cover"
            />
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
          </div>
          <div className="flex justify-center mt-4">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={stopRecording}
            >
              <StopCircle className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show preview if video selected
  if (videoFile && videoPreviewUrl) {
    return (
      <Card className="border-2 border-primary">
        <CardContent className="p-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={videoPreviewUrl}
              controls
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
        </CardContent>
      </Card>
    );
  }

  // Show upload zone
  return (
    <div className="space-y-3">
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
      
      {/* Hidden video element for recording - will be shown when recording starts */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="hidden"
      />
    </div>
  );
}
