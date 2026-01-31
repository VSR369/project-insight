/**
 * Camera Selector Component
 * Allows users to switch between front/back camera (mobile) or select from available webcams
 */

import { useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  getVideoInputDevices,
  savePreferredCamera,
  getPreferredCamera,
  savePreferredFacingMode,
  getPreferredFacingMode,
  type VideoInputDevice,
} from './videoUtils';

interface CameraSelectorProps {
  onDeviceSelect?: (deviceId: string | null, facingMode: 'user' | 'environment') => void;
  disabled?: boolean;
  compact?: boolean;
}

export function CameraSelector({ 
  onDeviceSelect, 
  disabled,
  compact = false 
}: CameraSelectorProps) {
  const [devices, setDevices] = useState<VideoInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const videoDevices = await getVideoInputDevices();
      setDevices(videoDevices);
      setHasMultipleCameras(videoDevices.length > 1);

      // Restore saved preference
      const savedDeviceId = getPreferredCamera();
      const savedFacingMode = getPreferredFacingMode();
      
      if (savedDeviceId && videoDevices.some(d => d.deviceId === savedDeviceId)) {
        setSelectedDeviceId(savedDeviceId);
      }
      setFacingMode(savedFacingMode);
      
    } catch (error) {
      console.error('[CameraSelector] Failed to load devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeviceSelect = useCallback((deviceId: string | null) => {
    setSelectedDeviceId(deviceId);
    if (deviceId) {
      savePreferredCamera(deviceId);
    }
    onDeviceSelect?.(deviceId, facingMode);
  }, [facingMode, onDeviceSelect]);

  const handleFacingModeToggle = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    savePreferredFacingMode(newMode);
    setSelectedDeviceId(null); // Clear device selection when toggling facing mode
    onDeviceSelect?.(null, newMode);
  }, [facingMode, onDeviceSelect]);

  const getSelectedLabel = () => {
    if (selectedDeviceId) {
      const device = devices.find(d => d.deviceId === selectedDeviceId);
      return device?.label || 'Camera';
    }
    return facingMode === 'user' ? 'Front Camera' : 'Back Camera';
  };

  // Don't show if only one camera and not on mobile
  if (devices.length <= 1 && !hasMultipleCameras) {
    return null;
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleFacingModeToggle}
        disabled={disabled || isLoading}
        className="h-8 w-8"
        title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
      >
        <Camera className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          <span className="truncate max-w-[120px]">{getSelectedLabel()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {/* Quick toggle for mobile */}
        <DropdownMenuItem onClick={handleFacingModeToggle}>
          <Camera className="h-4 w-4 mr-2" />
          <span>
            {facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
          </span>
        </DropdownMenuItem>

        {devices.length > 0 && (
          <>
            <DropdownMenuSeparator />
            
            {devices.map((device) => (
              <DropdownMenuItem
                key={device.deviceId}
                onClick={() => handleDeviceSelect(device.deviceId)}
              >
                {selectedDeviceId === device.deviceId && (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {selectedDeviceId !== device.deviceId && (
                  <span className="w-4 mr-2" />
                )}
                <span className="truncate">{device.label}</span>
                {device.isFrontCamera && (
                  <span className="ml-auto text-xs text-muted-foreground">Front</span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={loadDevices} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Cameras</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
