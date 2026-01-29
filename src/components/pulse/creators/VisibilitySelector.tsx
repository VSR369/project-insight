/**
 * Visibility Selector Component
 * Toggle between public and connections-only visibility
 */

import { Globe, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface VisibilitySelectorProps {
  value: 'public' | 'connections';
  onChange: (value: 'public' | 'connections') => void;
  disabled?: boolean;
}

export function VisibilitySelector({ value, onChange, disabled }: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Visibility</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as 'public' | 'connections')}
        disabled={disabled}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="public" id="visibility-public" />
          <Label 
            htmlFor="visibility-public" 
            className="flex items-center gap-1.5 cursor-pointer text-sm"
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            Public
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="connections" id="visibility-connections" />
          <Label 
            htmlFor="visibility-connections" 
            className="flex items-center gap-1.5 cursor-pointer text-sm"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            Connections Only
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
