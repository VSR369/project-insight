/**
 * LegalDocumentListPage — Platform agreements + legacy documents.
 * Route: /admin/legal-documents
 */
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLegalDocumentTemplates } from '@/hooks/queries/useLegalDocumentTemplates';
import { PlatformAgreementsSection } from '@/components/admin/legal/PlatformAgreementsSection';
import { LegacyDocumentsSection } from '@/components/admin/legal/LegacyDocumentsSection';
import type { DocumentCode } from '@/types/legal.types';

export default function LegalDocumentListPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useLegalDocumentTemplates(true, ['DRAFT', 'ACTIVE', 'ARCHIVED']);

  const handleEdit = (id: string) => navigate(`/admin/legal-documents/${id}/edit`);
  const handleCreate = (code: DocumentCode) => navigate(`/admin/legal-documents/new?code=${code}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Legal Document Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage platform agreements and challenge legal documents
          </p>
        </div>
        <Button onClick={() => navigate('/admin/legal-documents/new')}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden lg:inline">Add Document</span>
        </Button>
      </div>

      <PlatformAgreementsSection
        templates={templates}
        onEdit={handleEdit}
        onCreate={handleCreate}
      />

      <LegacyDocumentsSection
        templates={templates}
        onEdit={handleEdit}
      />
    </div>
  );
}
