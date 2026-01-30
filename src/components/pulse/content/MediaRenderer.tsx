/**
 * Media Renderer Component
 * Renders different media types for pulse content (reels, podcasts, galleries, etc.)
 * Per Phase D specification - with video autoplay on scroll
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { PulseContentType } from '@/constants/pulse.constants';

interface MediaRendererProps {
  contentType: PulseContentType;
  mediaUrls: string[];
  coverImageUrl?: string;
  title?: string;
  audioWaveformData?: number[];
  className?: string;
  isPreview?: boolean;
  isInFeed?: boolean; // Enable autoplay behavior for feed view
}

export function MediaRenderer({
  contentType,
  mediaUrls,
  coverImageUrl,
  title,
  audioWaveformData,
  className,
  isPreview = false,
  isInFeed = false,
}: MediaRendererProps) {
  if (!mediaUrls || mediaUrls.length === 0) {
    // Fallback for content without media
    if (coverImageUrl) {
      return (
        <div className={cn("relative rounded-lg overflow-hidden bg-muted", className)}>
          <img
            src={coverImageUrl}
            alt={title || 'Content preview'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }
    return null;
  }

  switch (contentType) {
    case 'reel':
      return (
        <VideoPlayer
          src={mediaUrls[0]}
          coverImageUrl={coverImageUrl}
          isPreview={isPreview}
          isInFeed={isInFeed}
          className={className}
        />
      );
    case 'podcast':
      return (
        <AudioPlayer
          src={mediaUrls[0]}
          coverImageUrl={coverImageUrl}
          title={title}
          waveformData={audioWaveformData}
          className={className}
        />
      );
    case 'gallery':
      return (
        <GalleryViewer
          images={mediaUrls}
          isPreview={isPreview}
          className={className}
        />
      );
    case 'post':
      return (
        <SingleImage
          src={mediaUrls[0]}
          alt={title || 'Post image'}
          className={className}
        />
      );
    default:
      return null;
  }
}

// =====================================================
// VIDEO PLAYER (Reels) with Intersection Observer
// =====================================================

interface VideoPlayerProps {
  src: string;
  coverImageUrl?: string;
  isPreview?: boolean;
  isInFeed?: boolean;
  className?: string;
}

function VideoPlayer({ src, coverImageUrl, isPreview, isInFeed, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Intersection Observer for autoplay in feed
  useEffect(() => {
    if (!isInFeed || isPreview) return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Video is 50%+ visible - autoplay (muted)
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {
            // Autoplay blocked by browser - that's ok
          });
          setIsPlaying(true);
        } else {
          // Video is less than 50% visible - pause
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isInFeed, isPreview]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    setProgress((current / duration) * 100);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration;
    videoRef.current.currentTime = (value[0] / 100) * duration;
  };

  const handleEnterFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  // Preview mode: just show cover with play button
  if (isPreview) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[400px] mx-auto w-full max-w-[280px] sm:max-w-[320px]", className)}>
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt="Video preview"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="h-16 w-16 rounded-full bg-background/90 flex items-center justify-center">
            <Play className="h-8 w-8 text-foreground ml-1" aria-hidden="true" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[600px] mx-auto w-full max-w-[350px] sm:max-w-[400px]", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        poster={coverImageUrl}
        muted={isMuted}
        loop
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
          onClick={togglePlay}
          aria-label="Play video"
        >
          <div className="h-16 w-16 rounded-full bg-background/90 flex items-center justify-center">
            <Play className="h-8 w-8 text-foreground ml-1" />
          </div>
        </button>
      )}

      {/* Controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent transition-opacity",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="mb-2"
          aria-label="Video progress"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleEnterFullscreen}
            aria-label="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// AUDIO PLAYER (Podcasts)
// =====================================================

interface AudioPlayerProps {
  src: string;
  coverImageUrl?: string;
  title?: string;
  waveformData?: number[];
  className?: string;
}

function AudioPlayer({ src, coverImageUrl, title, waveformData, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = (value[0] / 100) * duration;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 p-4", className)}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-4">
        {/* Cover Image */}
        <div className="relative h-16 w-16 rounded-lg bg-primary/20 flex-shrink-0 overflow-hidden">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Volume2 className="h-8 w-8 text-primary/50" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-medium text-sm truncate mb-2">{title}</p>
          )}

          {/* Waveform Visualization */}
          <div className="h-8 flex items-end gap-[2px] mb-2">
            {(waveformData || Array.from({ length: 40 }, () => Math.random())).map((value, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full transition-all",
                  (i / 40) * 100 < progress ? "bg-primary" : "bg-primary/30"
                )}
                style={{ height: `${Math.max(4, value * 100)}%` }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="flex-1"
              aria-label="Audio progress"
            />
            
            <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// GALLERY VIEWER
// =====================================================

interface GalleryViewerProps {
  images: string[];
  isPreview?: boolean;
  className?: string;
}

function GalleryViewer({ images, isPreview, className }: GalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  if (images.length === 0) return null;

  // Preview mode: show grid of thumbnails
  if (isPreview && images.length > 1) {
    const displayImages = images.slice(0, 4);
    const remaining = images.length - 4;

    return (
      <div className={cn("grid gap-1 rounded-lg overflow-hidden", className, {
        "grid-cols-2": images.length >= 2,
      })}>
        {displayImages.map((src, i) => (
          <div
            key={i}
            className={cn(
              "relative aspect-square bg-muted",
              images.length === 3 && i === 0 && "row-span-2"
            )}
          >
            {imageErrors.has(i) ? (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={src}
                alt={`Gallery image ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => handleImageError(i)}
              />
            )}
            {i === 3 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{remaining}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Full gallery view with navigation
  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-muted", className)}>
      <div className="aspect-square relative">
        {imageErrors.has(currentIndex) ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={images[currentIndex]}
            alt={`Gallery image ${currentIndex + 1} of ${images.length}`}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={() => handleImageError(currentIndex)}
          />
        )}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={goToPrev}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={goToNext}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i === currentIndex ? "bg-white" : "bg-white/50"
              )}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === currentIndex}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

// =====================================================
// SINGLE IMAGE
// =====================================================

interface SingleImageProps {
  src: string;
  alt: string;
  className?: string;
}

function SingleImage({ src, alt, className }: SingleImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={cn("rounded-lg bg-muted aspect-video flex items-center justify-center", className)}>
        <ImageIcon className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg overflow-hidden bg-muted", className)}>
      <img
        src={src}
        alt={alt}
        className="w-full h-auto max-h-[400px] object-cover"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
