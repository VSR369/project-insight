/**
 * LegalDocumentListPage — Card grid showing all legal document templates.
 * Route: /admin/legal-documents
 */
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLegalDocumentTemplates } from '@/hooks/queries/useLegalDocumentTemplates';
import { LegalDocumentCard } from '@/components/admin/legal/LegalDocumentCard';
import type { DocumentCode } from '@/types/legal.types';

const DOCUMENT_CODES: DocumentCode[] = ['PMA', 'CA', 'PSA', 'IPAA', 'EPIA'];

export default function LegalDocumentListPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useLegalDocumentTemplates(true, ['DRAFT', 'ACTIVE']);

  const templatesByCode = templates.reduce<Record<string, typeof templates>>(
    (acc, t) => {
      if (t.document_code) {
        acc[t.document_code] = acc[t.document_code] || [];
        acc[t.document_code].push(t);
      }
      return acc;
    },
    {},
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Legal Document Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage the 5 master legal documents for the platform
          </p>
        </div>
        <Button onClick={() => navigate('/admin/legal-documents/new')}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden lg:inline">Add Document</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DOCUMENT_CODES.map((code) => (
          <LegalDocumentCard
            key={code}
            code={code}
            templates={templatesByCode[code] ?? []}
            onEdit={(id) => navigate(`/admin/legal-documents/${id}/edit`)}
            onCreate={() => navigate(`/admin/legal-documents/new?code=${code}`)}
          />
        ))}
      </div>
    </div>
  );
}
