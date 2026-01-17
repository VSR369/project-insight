import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Link2, 
  FileText,
  Briefcase,
  GraduationCap,
  Trophy,
  BookOpen,
  Award,
  Tag,
  Eye
} from 'lucide-react';
import type { ProofPointWithCounts } from '@/hooks/queries/useProofPoints';

const typeIcons: Record<string, typeof Briefcase> = {
  project: Briefcase,
  case_study: FileText,
  certification: GraduationCap,
  award: Trophy,
  publication: BookOpen,
  portfolio: Award,
  testimonial: FileText,
  other: FileText,
};

const typeLabels: Record<string, string> = {
  project: 'Project',
  case_study: 'Case Study',
  certification: 'Certification',
  award: 'Award',
  publication: 'Publication',
  portfolio: 'Portfolio',
  testimonial: 'Testimonial',
  other: 'Other',
};

interface ProofPointCardProps {
  proofPoint: ProofPointWithCounts;
  currentIndustryId?: string; // NEW: To compare with proof point's industry
  onView?: (proofPoint: ProofPointWithCounts) => void;
  onEdit?: (proofPoint: ProofPointWithCounts) => void;
  onDelete?: (proofPoint: ProofPointWithCounts) => void;
  animationDelay?: number;
}

export function ProofPointCard({ 
  proofPoint, 
  currentIndustryId,
  onView,
  onEdit, 
  onDelete,
  animationDelay = 0 
}: ProofPointCardProps) {
  const Icon = typeIcons[proofPoint.type] || FileText;
  const isSpecialty = proofPoint.category === 'specialty_specific';
  const hasSpecialityTags = proofPoint.tagsCount > 0;
  
  // Check if proof point is from a different industry
  const isFromPreviousIndustry = currentIndustryId && 
    proofPoint.industry_segment_id && 
    proofPoint.industry_segment_id !== currentIndustryId;

  return (
    <Card 
      className="hover:shadow-md transition-all duration-300 animate-fade-in cursor-pointer"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
      onDoubleClick={() => onView?.(proofPoint)}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Type Icon */}
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Title and Badges */}
                <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{proofPoint.title}</h3>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {typeLabels[proofPoint.type] || proofPoint.type}
                  </Badge>
                  {isSpecialty ? (
                    hasSpecialityTags ? (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Speciality
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                        Speciality (Not Tagged)
                      </Badge>
                    )
                  ) : (
                    <Badge variant="secondary" className="text-xs shrink-0 bg-secondary/50">
                      General
                    </Badge>
                  )}
                  {/* Previous Industry Badge */}
                  {isFromPreviousIndustry && (
                    <Badge variant="outline" className="text-xs shrink-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                      Previous Industry
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {proofPoint.description}
                </p>
              </div>

              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(proofPoint)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(proofPoint)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(proofPoint)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Counts */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {proofPoint.linksCount > 0 && (
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {proofPoint.linksCount} link{proofPoint.linksCount !== 1 ? 's' : ''}
                </span>
              )}
              {proofPoint.filesCount > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {proofPoint.filesCount} file{proofPoint.filesCount !== 1 ? 's' : ''}
                </span>
              )}
              {proofPoint.tagsCount > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {proofPoint.tagsCount} specialit{proofPoint.tagsCount !== 1 ? 'ies' : 'y'}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
