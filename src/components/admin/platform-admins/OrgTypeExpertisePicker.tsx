import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ORG_TYPES = [
  'Corporation',
  'Partnership',
  'LLC',
  'Non-Profit',
  'Government',
  'Academic',
  'Other',
] as const;

interface OrgTypeExpertisePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function OrgTypeExpertisePicker({ value, onChange, disabled }: OrgTypeExpertisePickerProps) {
  const toggle = (type: string) => {
    if (value.includes(type)) {
      onChange(value.filter((v) => v !== type));
    } else {
      onChange([...value, type]);
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      {ORG_TYPES.map((type) => (
        <div key={type} className="flex items-center space-x-2">
          <Checkbox
            id={`org-type-${type}`}
            checked={value.includes(type)}
            onCheckedChange={() => toggle(type)}
            disabled={disabled}
          />
          <Label htmlFor={`org-type-${type}`} className="text-sm cursor-pointer">
            {type}
          </Label>
        </div>
      ))}
    </div>
  );
}
