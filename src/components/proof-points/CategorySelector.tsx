import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Tag } from 'lucide-react';

type Category = 'general' | 'specialty_specific';

interface CategorySelectorProps {
  value: Category;
  onChange: (value: Category) => void;
  disabled?: boolean;
}

export function CategorySelector({ value, onChange, disabled }: CategorySelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">
        Category <span className="text-destructive">*</span>
      </Label>
      <RadioGroup 
        value={value} 
        onValueChange={(v) => onChange(v as Category)}
        disabled={disabled}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* General Option */}
        <Label
          htmlFor="category-general"
          className={`cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Card 
            className={`transition-all duration-200 ${
              value === 'general' 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'hover:border-primary/50'
            }`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <RadioGroupItem value="general" id="category-general" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="font-medium">General</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Not tied to specific expertise area
                </p>
              </div>
            </CardContent>
          </Card>
        </Label>

        {/* Speciality Option */}
        <Label
          htmlFor="category-specialty"
          className={`cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Card 
            className={`transition-all duration-200 ${
              value === 'specialty_specific' 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'hover:border-primary/50'
            }`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <RadioGroupItem value="specialty_specific" id="category-specialty" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-medium">Speciality</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Related to declared expertise areas
                </p>
              </div>
            </CardContent>
          </Card>
        </Label>
      </RadioGroup>
    </div>
  );
}
