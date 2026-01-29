/**
 * Audio Recorder Component
 * Handles microphone recording with pause/resume functionality
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play, Upload } from "lucide-react";
import { WaveformDisplay } from "./WaveformDisplay";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onUploadClick: () => void;
  maxDuration?: number; // in seconds
  className?: string;
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";

export function AudioRecorder({
  onRecordingComplete,
  onUploadClick,
  maxDuration = 3600, // 60 minutes default
  className,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
      
      if (elapsed >= maxDuration) {
        stopRecording();
      }
    }, 1000);
  }, [maxDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedDurationRef.current = duration;
  }, [duration]);

  const startRecording = async () => {
    try {
      setError(null);
      chunksRef.current = [];
      pausedDurationRef.current = 0;
      setDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") 
          ? "audio/webm" 
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        onRecordingComplete(audioBlob, duration);
      };

      mediaRecorder.start(1000); // Collect data every second
      setState("recording");
      startTimer();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      setState("recording");
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state !== "idle") {
      stopTimer();
      mediaRecorderRef.current.stop();
      setState("stopped");
    }
  };

  const resetRecording = () => {
    setState("idle");
    setDuration(0);
    pausedDurationRef.current = 0;
    chunksRef.current = [];
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Waveform Display */}
      <div className="bg-muted/50 rounded-xl p-6">
        <WaveformDisplay 
          isRecording={state === "recording"} 
          barCount={50}
        />
        
        {/* Timer */}
        <div className="text-center mt-4">
          <span className="text-3xl font-mono font-bold">
            {formatTime(duration)}
          </span>
          {state === "recording" && (
            <span className="ml-2 text-sm text-red-500 animate-pulse">
              ● Recording
            </span>
          )}
          {state === "paused" && (
            <span className="ml-2 text-sm text-yellow-500">
              ⏸ Paused
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {state === "idle" && (
          <>
            <Button
              type="button"
              size="lg"
              onClick={startRecording}
              className="gap-2"
            >
              <Mic className="h-5 w-5" />
              Record Now
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={onUploadClick}
              className="gap-2"
            >
              <Upload className="h-5 w-5" />
              Upload Audio
            </Button>
          </>
        )}

        {state === "recording" && (
          <>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={pauseRecording}
              className="gap-2"
            >
              <Pause className="h-5 w-5" />
              Pause
            </Button>
            <Button
              type="button"
              size="lg"
              variant="destructive"
              onClick={stopRecording}
              className="gap-2"
            >
              <Square className="h-5 w-5" />
              Stop
            </Button>
          </>
        )}

        {state === "paused" && (
          <>
            <Button
              type="button"
              size="lg"
              onClick={resumeRecording}
              className="gap-2"
            >
              <Play className="h-5 w-5" />
              Resume
            </Button>
            <Button
              type="button"
              size="lg"
              variant="destructive"
              onClick={stopRecording}
              className="gap-2"
            >
              <Square className="h-5 w-5" />
              Stop
            </Button>
          </>
        )}

        {state === "stopped" && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={resetRecording}
            className="gap-2"
          >
            <Mic className="h-5 w-5" />
            Record Again
          </Button>
        )}
      </div>

      {/* Max Duration Info */}
      <p className="text-xs text-muted-foreground text-center">
        Maximum recording duration: {Math.floor(maxDuration / 60)} minutes
      </p>
    </div>
  );
}
