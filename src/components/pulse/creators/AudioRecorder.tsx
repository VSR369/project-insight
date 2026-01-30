/**
 * Audio Recorder Component - FIXED VERSION
 * 
 * Fixes:
 * 1. Duration closure issue - uses durationRef to get current duration
 * 2. Added stream validation before recording
 * 3. Better cleanup handling with streamRef
 * 4. Added audio level monitoring to verify mic is working
 * 5. Better MIME type detection
 * 6. Specific error messages per error type
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
  const [audioLevel, setAudioLevel] = useState(0); // For visual feedback
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // FIX: Store stream in ref
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const durationRef = useRef<number>(0); // FIX: Track duration in ref for onstop callback
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep durationRef in sync with duration state
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Comprehensive cleanup function
  const cleanup = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    mediaRecorderRef.current = null;
    
    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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

  // Monitor audio levels for visual feedback
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(100, (average / 128) * 100);
        setAudioLevel(normalized);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (e) {
      console.warn("[AudioRecorder] Could not start audio level monitoring:", e);
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      chunksRef.current = [];
      pausedDurationRef.current = 0;
      setDuration(0);
      durationRef.current = 0;

      console.log("[AudioRecorder] Requesting microphone permission...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Validate audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No audio track available");
      }
      
      console.log("[AudioRecorder] Audio track:", {
        label: audioTrack.label,
        readyState: audioTrack.readyState,
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
      });
      
      if (audioTrack.readyState !== "live") {
        throw new Error("Audio track is not live");
      }
      
      // Start audio level monitoring
      startAudioLevelMonitoring(stream);
      
      // Better MIME type detection
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") 
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") 
          ? "audio/webm" 
          : "audio/mp4";
      
      console.log("[AudioRecorder] Using mimeType:", mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log("[AudioRecorder] Chunk received:", event.data.size, "bytes");
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("[AudioRecorder] Recording stopped");
        
        // Calculate total size
        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log("[AudioRecorder] Total recorded:", totalSize, "bytes");
        
        if (totalSize === 0) {
          setError("Recording failed - no audio data captured");
          cleanup();
          setState("idle");
          return;
        }
        
        // Use BASE mime type for the blob (strip codec params)
        const baseMimeType = (mediaRecorder.mimeType || "audio/webm").split(";")[0];
        const audioBlob = new Blob(chunksRef.current, { type: baseMimeType });
        
        console.log("[AudioRecorder] Created blob:", audioBlob.size, "bytes, type:", baseMimeType);
        
        // FIX: Use durationRef.current instead of duration (which would be stale)
        const finalDuration = durationRef.current;
        console.log("[AudioRecorder] Duration:", finalDuration, "seconds");
        
        // Cleanup stream and audio context
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        setAudioLevel(0);
        
        // Pass to parent with correct duration
        onRecordingComplete(audioBlob, finalDuration);
      };

      mediaRecorder.onerror = (event) => {
        console.error("[AudioRecorder] MediaRecorder error:", event);
        setError("Recording error occurred");
        cleanup();
        setState("idle");
      };

      mediaRecorder.start(1000); // Collect data every second
      console.log("[AudioRecorder] Recording started");
      
      setState("recording");
      startTimer();
      
    } catch (err) {
      const error = err as Error;
      console.error("[AudioRecorder] Error:", error);
      
      // Specific error messages
      if (error.name === "NotAllowedError") {
        setError("Microphone permission denied. Please allow access in browser settings.");
      } else if (error.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone.");
      } else if (error.name === "NotReadableError") {
        setError("Microphone is in use by another application.");
      } else {
        setError(error.message || "Could not access microphone.");
      }
      
      cleanup();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
      stopTimer();
      
      // Pause level monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      setState("recording");
      startTimer();
      
      // Resume level monitoring
      if (streamRef.current) {
        startAudioLevelMonitoring(streamRef.current);
      }
    }
  };

  const stopRecording = useCallback(() => {
    console.log("[AudioRecorder] stopRecording called, state:", state);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.requestData(); // Flush any pending data
      mediaRecorderRef.current.stop();
      setState("stopped");
    }
  }, [state]);

  const resetRecording = () => {
    setState("idle");
    setDuration(0);
    pausedDurationRef.current = 0;
    durationRef.current = 0;
    chunksRef.current = [];
    setError(null);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Waveform Display */}
      <div className="bg-muted/50 rounded-xl p-6">
        <WaveformDisplay 
          isRecording={state === "recording"} 
          barCount={50}
        />
        
        {/* Audio Level Indicator - shows during recording */}
        {state === "recording" && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground min-w-[200px]">
              {audioLevel > 5 
                ? "🎤 Microphone is picking up sound" 
                : "🔇 No sound detected - speak into microphone"}
            </span>
          </div>
        )}
        
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
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-sm text-destructive text-center">{error}</p>
        </div>
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
