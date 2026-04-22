import { FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FcLegalDocsViewer } from '@/components/cogniblend/fc/FcLegalDocsViewer';

interface FcLegalAgreementTabProps {
  challengeId: string;
}

export function FcLegalAgreementTab({ challengeId }: FcLegalAgreementTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>Reference only</AlertTitle>
        <AlertDescription>
          The Legal Coordinator owns approval of this agreement. Finance can review it here for context while preparing escrow details.
        </AlertDescription>
      </Alert>
      <FcLegalDocsViewer challengeId={challengeId} />
    </div>
  );
}

export default FcLegalAgreementTab;
