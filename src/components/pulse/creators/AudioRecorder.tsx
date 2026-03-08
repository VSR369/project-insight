/**
 * Audio Recorder Component - ROBUST VERSION
 * 
 * Features:
 * 1. Browser-aware MIME type selection for cross-browser compatibility
 * 2. RMS-based audio level meter (accurate speech detection)
 * 3. Post-recording validation to detect silent recordings
 * 4. Device selector for choosing specific microphone
 * 5. Clear error messages with actionable guidance
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play, Upload, Settings2 } from "lucide-react";
import { WaveformDisplay } from "./WaveformDisplay";
import { MicrophoneSelector } from "./MicrophoneSelector";
import { cn } from "@/lib/utils";
import {
  getSupportedMimeType,
  calculateRMSFromTimeDomain,
  validateRecordedAudio,
  isSuspiciousDevice,
  getPreferredDevice,
} from "./audioUtils";
import { logWarning, logDebug } from "@/lib/errorHandler";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onUploadClick: () => void;
  maxDuration?: number; // in seconds
  className?: string;
}

type RecordingState = "idle" | "recording" | "paused" | "validating" | "stopped";

export function AudioRecorder({
  onRecordingComplete,
  onUploadClick,
  maxDuration = 3600, // 60 minutes default
  className,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [suggestDeviceChange, setSuggestDeviceChange] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    getPreferredDevice()
  );
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("");
  const extensionRef = useRef<string>("webm");

  // Keep durationRef in sync with duration state
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Comprehensive cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    mediaRecorderRef.current = null;
    
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

  // RMS-based audio level monitoring (more accurate for speech)
  const startAudioLevelMonitoring = useCallback(async (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Use time-domain data for RMS calculation
      const dataArray = new Uint8Array(analyser.fftSize);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteTimeDomainData(dataArray);
        const rmsLevel = calculateRMSFromTimeDomain(dataArray);
        setAudioLevel(rmsLevel);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (e) {
      logWarning("Could not start audio level monitoring", { operation: 'start_audio_monitoring', additionalData: { error: String(e) } });
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setSuggestDeviceChange(false);
      chunksRef.current = [];
      pausedDurationRef.current = 0;
      setDuration(0);
      durationRef.current = 0;

      logDebug("[AudioRecorder] Requesting microphone permission...", { operation: "audio_recording" });
      
      // Build constraints with optional device selection
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
        logDebug("[AudioRecorder] Using selected device: " + selectedDeviceId, { operation: "audio_recording" });
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      streamRef.current = stream;
      
      // Validate audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No audio track available");
      }
      
      audioTrack.enabled = true;
      
      const trackLabel = audioTrack.label;
      logDebug(`[AudioRecorder] Audio track: ${trackLabel}, state: ${audioTrack.readyState}`, { operation: "audio_recording" });
      
      // Warn if suspicious device
      if (isSuspiciousDevice(trackLabel)) {
        logWarning("Suspicious device detected", { operation: 'check_audio_device', additionalData: { label: trackLabel } });
      }
      
      if (audioTrack.readyState !== "live") {
        throw new Error("Audio track is not live");
      }
      
      await startAudioLevelMonitoring(stream);
      
      // Get best supported MIME type for this browser
      const { mimeType, extension, baseMimeType } = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      extensionRef.current = extension;
      
      console.log("[AudioRecorder] Using MIME type:", mimeType, "Extension:", extension);
      
      // Create MediaRecorder with or without explicit mimeType
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log("[AudioRecorder] Chunk received:", event.data.size, "bytes");
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("[AudioRecorder] Recording stopped, validating...");
        setState("validating");
        
        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log("[AudioRecorder] Total recorded:", totalSize, "bytes");
        
        if (totalSize === 0) {
          setError("Recording failed - no audio data captured. Please check your microphone.");
          setSuggestDeviceChange(true);
          cleanup();
          setState("idle");
          return;
        }
        
        // Create blob with correct base MIME type
        const actualMimeType = mediaRecorder.mimeType || mimeTypeRef.current;
        const baseMime = actualMimeType.split(";")[0] || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: baseMime });
        
        console.log("[AudioRecorder] Created blob:", audioBlob.size, "bytes, type:", baseMime);
        
        // Validate the recording has actual audio
        const validation = await validateRecordedAudio(audioBlob);
        
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
        
        if (!validation.isValid) {
          logWarning("[AudioRecorder] Validation failed: " + validation.errorMessage, { operation: "audio_recording_validation" });
          setError(validation.errorMessage || "Recording validation failed");
          setSuggestDeviceChange(validation.suggestDeviceChange || false);
          setState("idle");
          return;
        }
        
        logDebug("[AudioRecorder] Validation passed, RMS: " + validation.rms.toFixed(4), { operation: "audio_recording_validation" });
        
        // Pass to parent with correct duration
        const finalDuration = durationRef.current || Math.round(validation.duration);
        onRecordingComplete(audioBlob, finalDuration);
        setState("stopped");
      };

      mediaRecorder.onerror = (event) => {
        logWarning("[AudioRecorder] MediaRecorder error: " + String(event), { operation: "audio_recording" });
        setError("Recording error occurred. Please try again.");
        cleanup();
        setState("idle");
      };

      mediaRecorder.start(500); // Frequent chunks for reliability
      logDebug("[AudioRecorder] Recording started", { operation: "audio_recording" });
      
      setState("recording");
      startTimer();
      
    } catch (err) {
      const error = err as Error;
      logWarning("[AudioRecorder] Error: " + error.message, { operation: "audio_recording" });
      
      if (error.name === "NotAllowedError") {
        setError("Microphone permission denied. Please allow access in your browser settings.");
      } else if (error.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone and try again.");
        setSuggestDeviceChange(true);
      } else if (error.name === "NotReadableError") {
        setError("Microphone is in use by another application or not accessible.");
        setSuggestDeviceChange(true);
      } else if (error.name === "OverconstrainedError") {
        // Selected device no longer available
        setError("Selected microphone is not available. Please choose a different one.");
        setSelectedDeviceId(null);
        setSuggestDeviceChange(true);
      } else {
        setError(error.message || "Could not access microphone. Please check your settings.");
      }
      
      cleanup();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
      stopTimer();
      
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
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const resetRecording = () => {
    setState("idle");
    setDuration(0);
    pausedDurationRef.current = 0;
    durationRef.current = 0;
    chunksRef.current = [];
    setError(null);
    setSuggestDeviceChange(false);
  };

  const handleDeviceChange = (deviceId: string | null) => {
    setSelectedDeviceId(deviceId);
    setSuggestDeviceChange(false);
    setError(null);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Device Selector (shown when needed or requested) */}
      {(showDeviceSelector || suggestDeviceChange) && state === "idle" && (
        <MicrophoneSelector
          onDeviceChange={handleDeviceChange}
          showWarning={suggestDeviceChange}
          className="mb-4"
        />
      )}
      
      {/* Waveform Display */}
      <div className="bg-muted/50 rounded-xl p-6">
        <WaveformDisplay 
          isRecording={state === "recording"} 
          barCount={50}
        />
        
        {/* Audio Level Indicator */}
        {(state === "recording" || state === "paused") && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-100",
                  audioLevel > 10 ? "bg-green-500" : audioLevel > 2 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, audioLevel)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
              {audioLevel > 10 
                ? "🎤 Microphone active" 
                : audioLevel > 2
                  ? "🔈 Weak signal"
                  : "🔇 No audio - check microphone"}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap sm:hidden">
              {audioLevel > 10 ? "🎤 Active" : audioLevel > 2 ? "🔈 Weak" : "🔇 Silent"}
            </span>
          </div>
        )}
        
        {/* Validating state */}
        {state === "validating" && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Verifying recording...</span>
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
          {suggestDeviceChange && !showDeviceSelector && (
            <div className="flex justify-center mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDeviceSelector(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Change Microphone
              </Button>
            </div>
          )}
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
            {!showDeviceSelector && (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={() => setShowDeviceSelector(true)}
                title="Choose microphone"
              >
                <Settings2 className="h-5 w-5" />
              </Button>
            )}
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
        
        {state === "validating" && (
          <Button
            type="button"
            size="lg"
            disabled
            className="gap-2"
          >
            Verifying...
          </Button>
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
