/**
 * LegalDocUploadSection — Creator legal document upload for MP model.
 * Shows platform default templates (read-only) and upload for org-specific docs.
 */

import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

interface LegalDocUploadSectionProps {
  challengeId: string;
  governanceMode: string;
}

interface LegalDocRow {
  id: string;
  document_type: string;
  document_name: string | null;
  status: string | null;
  tier: string;
}

export function LegalDocUploadSection({ challengeId, governanceMode }: LegalDocUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: existingDocs, isLoading } = useQuery<LegalDocRow[]>({
    queryKey: ['challenge-legal-docs', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, status, tier')
        .eq('challenge_id', challengeId)
        .order('tier');
      if (error) { handleQueryError(error, { operation: 'fetch_challenge_legal_docs' }); return []; }
      return (data ?? []) as LegalDocRow[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `legal-docs/${challengeId}/${crypto.randomUUID()}.${ext}`;
      const { error: storageErr } = await supabase.storage.from('challenge-files').upload(path, file);
      if (storageErr) throw storageErr;

      const payload = await withCreatedBy({
        challenge_id: challengeId,
        document_type: 'CUSTOM',
        document_name: file.name,
        tier: 'TIER_1',
        status: 'creator_uploaded',
        lc_status: 'pending',
      });
      const { error: dbErr } = await supabase.from('challenge_legal_docs').insert(payload);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge-legal-docs', challengeId] });
      toast.success('Legal document uploaded');
      setUploading(false);
    },
    onError: (e) => { handleMutationError(e, { operation: 'upload_legal_doc' }); setUploading(false); },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
  };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Legal Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingDocs && existingDocs.length > 0 ? (
          <div className="space-y-2">
            {existingDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-1.5 px-2 rounded border text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{doc.document_name ?? doc.document_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{doc.tier}</Badge>
                  <Badge variant={doc.status === 'creator_uploaded' ? 'secondary' : 'default'} className="text-[10px]">
                    {doc.status ?? 'platform'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No legal documents attached yet.</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="legal-upload" className="text-xs text-muted-foreground">
            Upload additional legal document (NDA, IP agreement, etc.)
          </Label>
          <div className="flex items-center gap-2">
            <Input id="legal-upload" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} disabled={uploading} className="text-sm" />
            <Button size="sm" variant="outline" disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
