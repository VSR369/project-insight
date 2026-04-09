/**
 * LcAddendumUpload — Upload and list challenge addenda for legal docs.
 * Reusable by both Curator (STRUCTURED) and LC (CONTROLLED) modes.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Loader2, Plus } from 'lucide-react';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { withCreatedBy } from '@/lib/auditFields';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { CACHE_STANDARD } from '@/config/queryCache';

interface LcAddendumUploadProps {
  challengeId: string;
}

interface AddendumRow {
  id: string;
  document_name: string | null;
  status: string | null;
  created_at: string;
}

const ADDENDUM_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as readonly string[],
  allowedExtensions: ['.pdf', '.docx'] as readonly string[],
  label: 'Challenge Addendum (PDF/DOCX)',
} as const;

export function LcAddendumUpload({ challengeId }: LcAddendumUploadProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const { data: addenda = [] } = useQuery<AddendumRow[]>({
    queryKey: ['challenge-addenda', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_name, status, created_at')
        .eq('challenge_id', challengeId)
        .eq('document_type', 'ADDENDUM')
        .order('created_at');
      if (error) { handleQueryError(error, { operation: 'fetch_addenda' }); throw error; }
      return (data ?? []) as AddendumRow[];
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const deleteMut = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('challenge_legal_docs').delete().eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['challenge-addenda', challengeId] }); toast.success('Addendum removed'); },
    onError: (e) => handleMutationError(e, { operation: 'delete_addendum' }),
  });

  const handleUpload = async (file: File | null) => {
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `legal-docs/${challengeId}/${crypto.randomUUID()}.${ext}`;
      const { error: storageErr } = await supabase.storage.from('challenge-files').upload(path, file);
      if (storageErr) throw storageErr;
      const payload = await withCreatedBy({
        challenge_id: challengeId,
        document_type: 'ADDENDUM',
        document_name: file.name,
        tier: 'TIER_1',
        is_assembled: false,
        status: 'draft',
        lc_status: 'pending',
      });
      const { error: dbErr } = await supabase.from('challenge_legal_docs').insert(payload);
      if (dbErr) throw dbErr;
      qc.invalidateQueries({ queryKey: ['challenge-addenda', challengeId] });
      toast.success('Addendum uploaded');
      setShowUpload(false);
    } catch (e) { handleMutationError(e as Error, { operation: 'upload_addendum' }); }
    finally { setUploading(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Addenda</CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowUpload(!showUpload)}>
            <Plus className="h-3 w-3 mr-1" />Add Addendum
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showUpload && (
          <FileUploadZone config={ADDENDUM_CONFIG} value={null} onChange={handleUpload} disabled={uploading} />
        )}
        {addenda.length === 0 && !showUpload && (
          <p className="text-xs text-muted-foreground">No addenda attached.</p>
        )}
        {addenda.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded border text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{a.document_name ?? 'Addendum'}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="secondary" className="text-[10px]">{a.status ?? 'draft'}</Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMut.mutate(a.id)} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
