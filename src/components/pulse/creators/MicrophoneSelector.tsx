/**
 * Microphone Selector Component
 * 
 * Allows users to select their preferred audio input device.
 * Shows device list with labels and highlights suspicious devices.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AudioDevice,
  getAudioInputDevices,
  getPreferredDevice,
  savePreferredDevice,
  isSuspiciousDevice,
} from "./audioUtils";

interface MicrophoneSelectorProps {
  onDeviceChange: (deviceId: string | null) => void;
  showWarning?: boolean;
  className?: string;
}

export function MicrophoneSelector({
  onDeviceChange,
  showWarning = false,
  className,
}: MicrophoneSelectorProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const audioDevices = await getAudioInputDevices();
      setDevices(audioDevices);
      
      // If we have devices and no selection, try to use preferred or first device
      if (audioDevices.length > 0) {
        const preferred = getPreferredDevice();
        const preferredExists = audioDevices.some(d => d.deviceId === preferred);
        
        if (preferred && preferredExists) {
          setSelectedDeviceId(preferred);
          onDeviceChange(preferred);
        } else if (!selectedDeviceId) {
          // Don't auto-select - let default behavior work
          // User can explicitly choose if there's an issue
        }
      }
    } catch (err) {
      setError("Could not load microphone list");
    } finally {
      setIsLoading(false);
    }
  }, [onDeviceChange, selectedDeviceId]);

  useEffect(() => {
    loadDevices();
    
    // Listen for device changes (e.g., plugging in a USB mic)
    const handleDeviceChange = () => {
      loadDevices();
    };
    
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    savePreferredDevice(deviceId);
    onDeviceChange(deviceId);
  };

  const handleUseDefault = () => {
    setSelectedDeviceId(null);
    onDeviceChange(null);
  };

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
        <AlertTriangle className="h-4 w-4" />
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={loadDevices}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showWarning && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-warning">Microphone issue detected</p>
            <p className="text-muted-foreground">
              Try selecting a different microphone below, or check your system audio settings.
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Microphone:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Select
          value={selectedDeviceId || "default"}
          onValueChange={(value) => {
            if (value === "default") {
              handleUseDefault();
            } else {
              handleSelect(value);
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Loading..." : "Select microphone"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              <span className="flex items-center gap-2">
                System Default
              </span>
            </SelectItem>
            {devices.map((device) => {
              const isSuspicious = isSuspiciousDevice(device.label);
              return (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  <span className={cn(
                    "flex items-center gap-2",
                    isSuspicious && "text-warning"
                  )}>
                    {device.label}
                    {isSuspicious && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={loadDevices}
          disabled={isLoading}
          title="Refresh device list"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>
      
      {devices.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground">
          No microphones detected. Please connect a microphone and click refresh.
        </p>
      )}
    </div>
  );
}
