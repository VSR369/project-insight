import { format } from 'date-fns';
import { Eye, Pencil, Link2, FileText, Tag, ExternalLink } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ProofPointWithCounts } from '@/hooks/queries/useProofPoints';
import { useProofPoint } from '@/hooks/queries/useProofPoints';
import { Loader2 } from 'lucide-react';

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

const categoryLabels: Record<string, string> = {
  general: 'General',
  specialty_specific: 'Specialty-Specific',
};

interface ProofPointViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proofPoint: ProofPointWithCounts | null;
  onEdit?: () => void;
}

export function ProofPointViewDialog({
  open,
  onOpenChange,
  proofPoint,
  onEdit,
}: ProofPointViewDialogProps) {
  const { data: fullProofPoint, isLoading } = useProofPoint(open ? proofPoint?.id : undefined);

  if (!proofPoint) return null;

  const handleEdit = () => {
    onEdit?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Proof Point Details
          </DialogTitle>
          <DialogDescription>
            View complete details for this proof point
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <div className="text-sm font-medium">{proofPoint.title}</div>
              </div>

              {/* Type & Category */}
              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div>
                    <Badge variant="outline">
                      {typeLabels[proofPoint.type] || proofPoint.type}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <div>
                    <Badge variant="secondary">
                      {categoryLabels[proofPoint.category] || proofPoint.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {proofPoint.description}
                </p>
              </div>

              {/* Speciality Tags */}
              {fullProofPoint?.specialityTags && fullProofPoint.specialityTags.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Linked Specialities
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {fullProofPoint.specialityTags.map((tag: any) => (
                      <Badge key={tag.speciality_id} variant="secondary" className="text-xs">
                        {tag.specialities?.name || 'Unknown'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {fullProofPoint?.links && fullProofPoint.links.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Supporting Links ({fullProofPoint.links.length})
                  </label>
                  <div className="space-y-2">
                    {fullProofPoint.links.map((link: any) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{link.title || link.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {fullProofPoint?.files && fullProofPoint.files.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Attached Files ({fullProofPoint.files.length})
                  </label>
                  <div className="space-y-1">
                    {fullProofPoint.files.map((file: any) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate">{file.file_name}</span>
                        {file.file_size && (
                          <span className="text-xs">
                            ({Math.round(file.file_size / 1024)} KB)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <Separator className="my-4" />
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                Metadata
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Created At</label>
                  <div className="text-xs">
                    {proofPoint.created_at
                      ? format(new Date(proofPoint.created_at), 'PPpp')
                      : 'Not set'}
                  </div>
                </div>
                {proofPoint.updated_at && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Updated At</label>
                    <div className="text-xs">
                      {format(new Date(proofPoint.updated_at), 'PPpp')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          {onEdit && (
            <Button variant="outline" onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
