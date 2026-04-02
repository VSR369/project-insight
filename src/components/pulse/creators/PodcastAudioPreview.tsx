/**
 * PodcastAudioPreview — Audio playback preview with waveform and controls.
 * Extracted from PodcastStudio.tsx.
 */

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, X } from "lucide-react";
import { formatBytes } from "@/lib/validations/media";
import { WaveformDisplay } from "./WaveformDisplay";

interface PodcastAudioPreviewProps {
  audioFile: File;
  audioUrl: string | null;
  audioDuration: number;
  onRemove: () => void;
}

export function PodcastAudioPreview({
  audioFile,
  audioUrl,
  audioDuration,
  onRemove,
}: PodcastAudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackComplete, setPlaybackComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (playbackComplete) {
        audioRef.current.currentTime = 0;
        setPlaybackComplete(false);
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <WaveformDisplay
        audioUrl={audioUrl || undefined}
        isPlaying={isPlaying}
        barCount={50}
      />

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={togglePlayback}
          className="gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="h-5 w-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Play
            </>
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          onClick={onRemove}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <X className="h-5 w-5" />
          Remove
        </Button>
      </div>

      {/* Audio Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>{audioFile.name}</p>
        <p>
          {formatBytes(audioFile.size)} • {formatDuration(audioDuration)}
        </p>
      </div>

      {/* Playback complete indicator */}
      {playbackComplete && (
        <p className="text-xs text-muted-foreground text-center">
          ✓ Playback complete - click Play to replay
        </p>
      )}

      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setPlaybackComplete(true);
          }}
          className="hidden"
        />
      )}
    </div>
  );
}
