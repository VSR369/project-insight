/**
 * Video Uploader Component
 * Drag/drop upload and webcam recording for reels
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Video, Camera, X, Play, Pause, StopCircle, Loader2 } from 'lucide-react';
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

export function VideoUploader({ 
  videoFile, 
  onVideoChange, 
  onCoverExtracted,
  disabled 
}: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Webcam recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `recording_${Date.now()}.webm`, {
          type: 'video/webm',
        });
        handleFileSelect(file);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
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
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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

  // Show recording UI
  if (isRecording) {
    return (
      <Card className="border-2 border-destructive">
        <CardContent className="p-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              muted
              playsInline
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
    </div>
  );
}
