/**
 * Waveform Display Component
 * Visualizes audio as animated bars or static waveform
 */

import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface WaveformDisplayProps {
  audioUrl?: string;
  isRecording?: boolean;
  isPlaying?: boolean;
  className?: string;
  barCount?: number;
}

export const WaveformDisplay = forwardRef<HTMLDivElement, WaveformDisplayProps>(
  function WaveformDisplay({
    audioUrl,
    isRecording = false,
    isPlaying = false,
    className,
    barCount = 40,
  }, ref) {
  const [bars, setBars] = useState<number[]>([]);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();

  // Generate random bars for recording animation
  useEffect(() => {
    if (isRecording) {
      const animate = () => {
        const newBars = Array.from({ length: barCount }, () => 
          Math.random() * 0.7 + 0.3
        );
        setBars(newBars);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // Slower animation rate
      const interval = setInterval(() => {
        animate();
      }, 100);

      return () => {
        clearInterval(interval);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else if (!audioUrl) {
      // Static bars when idle
      setBars(Array.from({ length: barCount }, () => 0.2));
    }
  }, [isRecording, barCount, audioUrl]);

  // Analyze audio file for static waveform
  useEffect(() => {
    if (audioUrl && !isRecording) {
      generateWaveformFromUrl(audioUrl);
    }
  }, [audioUrl, isRecording]);

  const generateWaveformFromUrl = async (url: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samplesPerBar = Math.floor(channelData.length / barCount);
      
      const waveformBars: number[] = [];
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          sum += Math.abs(channelData[i * samplesPerBar + j]);
        }
        const average = sum / samplesPerBar;
        waveformBars.push(Math.min(1, average * 3 + 0.1));
      }
      
      setBars(waveformBars);
      audioContext.close();
    } catch (error) {
      // Fallback to random bars on error
      setBars(Array.from({ length: barCount }, () => Math.random() * 0.5 + 0.2));
    }
  };

    return (
      <div 
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-0.5 h-24",
          className
        )}
      >
        {bars.map((height, index) => (
          <div
            key={index}
            className={cn(
              "w-1.5 rounded-full transition-all duration-100",
              isRecording 
                ? "bg-red-500" 
                : isPlaying 
                  ? "bg-primary" 
                  : "bg-primary/60"
            )}
            style={{
              height: `${height * 100}%`,
              minHeight: "4px",
            }}
          />
        ))}
      </div>
    );
  }
);
