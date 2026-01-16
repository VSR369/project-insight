import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Briefcase, 
  FileText, 
  GraduationCap, 
  Trophy, 
  BookOpen, 
  Award,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ProofPointType = Database['public']['Enums']['proof_point_type'];

const TYPE_OPTIONS: Array<{ value: ProofPointType; label: string; icon: typeof Briefcase; description: string }> = [
  { 
    value: 'project', 
    label: 'Project Case Study', 
    icon: Briefcase,
    description: 'Showcase a completed project with results'
  },
  { 
    value: 'certification', 
    label: 'Certification', 
    icon: GraduationCap,
    description: 'Professional certifications and credentials'
  },
  { 
    value: 'case_study', 
    label: 'Detailed Case Study', 
    icon: FileText,
    description: 'In-depth analysis of your work'
  },
  { 
    value: 'testimonial', 
    label: 'Client Testimonial', 
    icon: MessageSquare,
    description: 'Recommendations from clients or colleagues'
  },
  { 
    value: 'publication', 
    label: 'Publication/Article', 
    icon: BookOpen,
    description: 'Articles, papers, or blog posts'
  },
  { 
    value: 'award', 
    label: 'Award/Recognition', 
    icon: Trophy,
    description: 'Industry awards and recognitions'
  },
  { 
    value: 'portfolio', 
    label: 'Professional Profile', 
    icon: Award,
    description: 'Links to professional profiles or portfolios'
  },
  { 
    value: 'other', 
    label: 'References', 
    icon: MoreHorizontal,
    description: 'Other evidence of expertise'
  },
];

interface ProofPointTypeSelectProps {
  value: ProofPointType | '';
  onChange: (value: ProofPointType) => void;
  error?: string;
  disabled?: boolean;
}

export function ProofPointTypeSelect({ value, onChange, error, disabled }: ProofPointTypeSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="proof-point-type" className="text-sm font-medium">
        Type <span className="text-destructive">*</span>
      </Label>
      <Select 
        value={value} 
        onValueChange={(v) => onChange(v as ProofPointType)}
        disabled={disabled}
      >
        <SelectTrigger 
          id="proof-point-type"
          className={error ? 'border-destructive' : ''}
        >
          <SelectValue placeholder="Select proof point type..." />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4 text-muted-foreground" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export { TYPE_OPTIONS };
