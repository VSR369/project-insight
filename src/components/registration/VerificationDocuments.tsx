/**
 * Verification Documents (REG-001)
 * 
 * Conditional upload section shown only for NGO/Academic org types
 * that require subsidized pricing verification (BR-SUB-002).
 */

import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { FILE_LIMITS } from '@/config/registration';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VerificationDocumentsProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  orgTypeName?: string;
  discountPct?: number;
  disabled?: boolean;
}

export function VerificationDocuments({
  files,
  onFilesChange,
  orgTypeName,
  discountPct,
  disabled,
}: VerificationDocumentsProps) {
  return (
    <div className="space-y-3">
      <Alert className="border-destructive/50 bg-destructive/5">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-sm">
          <strong>{orgTypeName ?? 'This organization type'}</strong> qualifies for
          {discountPct ? ` a ${discountPct}% subsidized discount` : ' subsidized pricing'}.
          Please upload verification documents (e.g., registration certificate, tax-exempt letter)
          to complete eligibility verification.
        </AlertDescription>
      </Alert>

      <FileUploadZone
        config={FILE_LIMITS.VERIFICATION_DOCUMENT}
        multiple
        files={files}
        onFilesChange={onFilesChange}
        onChange={() => {}}
        disabled={disabled}
      />
    </div>
  );
}
