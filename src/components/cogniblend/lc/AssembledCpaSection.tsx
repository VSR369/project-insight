/**
 * AssembledCpaSection — Shows assembled CPA in the LC workspace with editing.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, ChevronDown, ChevronRight, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { handleMutationError } from '@/lib/errorHandler';
import { LcAddendumUpload } from './LcAddendumUpload';
import { handleMutationError } from '@/lib/errorHandler';

interface AssembledCpaSectionProps {
  challengeId: string;
}

interface AssembledDoc {
  id: string;
  document_type: string;
  document_name: string | null;
  content: string | null;
  assembly_variables: Record<string, string> | null;
  is_assembled: boolean;
  status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export function AssembledCpaSection({ challengeId }: AssembledCpaSectionProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showVars, setShowVars] = useState(false);

  const { data: docs, isLoading } = useQuery<AssembledDoc[]>({
    queryKey: ['assembled-cpa', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, content, assembly_variables, is_assembled, status, reviewed_by, reviewed_at')
        .eq('challenge_id', challengeId)
        .eq('is_assembled', true)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AssembledDoc[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });

  const handleStartEdit = (doc: AssembledDoc) => {
    setEditContent(doc.content ?? '');
    setEditing(true);
  };

  const handleSave = async (docId: string) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('challenge_legal_docs')
        .update({
          content: editContent,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', docId);
      if (error) throw new Error(error.message);
      toast.success('CPA content saved');
      setEditing(false);
    } catch (e) {
      handleMutationError(e as Error, { operation: 'save_assembled_cpa' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!docs?.length) return null;

  return (
    <div className="space-y-4">
      {docs.map((doc) => (
        <Card key={doc.id} className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {doc.document_name ?? 'Assembled CPA'}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-mono">{doc.document_type}</Badge>
                <Badge variant={doc.status === 'APPROVED' ? 'default' : 'secondary'} className="text-xs">
                  {doc.status ?? 'DRAFT'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {doc.assembly_variables && (
              <Collapsible open={showVars} onOpenChange={setShowVars}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                    {showVars ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    Assembly Variables ({Object.keys(doc.assembly_variables).length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 mt-2 text-xs">
                    {Object.entries(doc.assembly_variables).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <code className="text-primary font-mono">{k}:</code>
                        <span className="text-muted-foreground truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {editing ? (
              <div className="space-y-2">
                <RichTextEditor value={editContent} onChange={setEditContent} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave(doc.id)} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/50 rounded p-3 max-h-[300px] overflow-y-auto">
                  {doc.content ?? 'No content'}
                </pre>
                <Button size="sm" variant="outline" onClick={() => handleStartEdit(doc)}>
                  Edit Content
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <LcAddendumUpload challengeId={challengeId} />
    </div>
  );
}
