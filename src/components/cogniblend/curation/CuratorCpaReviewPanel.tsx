/**
 * CuratorCpaReviewPanel — STRUCTURED mode: curator reviews assembled CPA,
 * uploads addenda, and approves legal for publication.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { Scale, ChevronDown, ChevronRight, Save, Loader2, Unlock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUnfreezeForRecuration } from '@/hooks/cogniblend/useFreezeActions';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { withCreatedBy } from '@/lib/auditFields';
import { CACHE_STANDARD } from '@/config/queryCache';
import { LcAddendumUpload } from '@/components/cogniblend/lc/LcAddendumUpload';

interface CuratorCpaReviewPanelProps {
  challengeId: string;
  userId: string;
}

interface AssembledDoc {
  id: string;
  document_type: string;
  document_name: string | null;
  content: string | null;
  assembly_variables: Record<string, string> | null;
  status: string | null;
}

export function CuratorCpaReviewPanel({ challengeId, userId }: CuratorCpaReviewPanelProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const unfreezeMut = useUnfreezeForRecuration(challengeId);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [approving, setApproving] = useState(false);

  const { data: docs = [], isLoading } = useQuery<AssembledDoc[]>({
    queryKey: ['assembled-cpa', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, content, assembly_variables, status')
        .eq('challenge_id', challengeId)
        .eq('is_assembled', true)
        .order('created_at', { ascending: false });
      if (error) { handleQueryError(error, { operation: 'fetch_assembled_cpa' }); throw error; }
      return (data ?? []) as AssembledDoc[];
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const handleStartEdit = (doc: AssembledDoc) => {
    setEditContent(doc.content ?? '');
    setEditingDocId(doc.id);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editingDocId || !user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('challenge_legal_docs')
        .update({ content: editContent, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_by: user.id, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', editingDocId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['assembled-cpa', challengeId] });
      toast.success('CPA content saved');
      setEditing(false);
      setEditingDocId(null);
    } catch (e) { handleMutationError(e as Error, { operation: 'save_curator_cpa' }); }
    finally { setSaving(false); }
  };

  const handleApprove = async () => {
    if (!user?.id) return;
    setApproving(true);
    try {
      const { error } = await supabase.from('challenge_legal_docs')
        .update({ status: 'curator_reviewed', lc_status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_by: user.id } as Record<string, unknown>)
        .eq('challenge_id', challengeId);
      if (error) throw error;
      const { error: rpcErr } = await supabase.rpc('complete_phase', { p_challenge_id: challengeId, p_user_id: user.id });
      if (rpcErr) throw rpcErr;
      qc.invalidateQueries({ queryKey: ['curation-challenge', challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
      toast.success('Legal approved. Challenge publishing…');
    } catch (e) { handleMutationError(e as Error, { operation: 'approve_legal_publish' }); }
    finally { setApproving(false); }
  };

  const handleReturn = () => {
    if (returnReason.trim().length < 10) return;
    unfreezeMut.mutate({ userId, reason: returnReason.trim() }, {
      onSuccess: () => { setShowReturnDialog(false); setReturnReason(''); },
    });
  };

  const cpaDoc = docs[0];

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />Curator Legal Review
            <Badge variant="outline" className="ml-auto text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300">FROZEN</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading CPA…</p>}
          {!isLoading && !cpaDoc && <p className="text-sm text-muted-foreground">No assembled CPA found. Use Assemble CPA action first.</p>}
          {cpaDoc && (
            <>
              {cpaDoc.assembly_variables && (
                <Collapsible open={showVars} onOpenChange={setShowVars}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                      {showVars ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      Assembly Variables ({Object.keys(cpaDoc.assembly_variables).length})
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 mt-2 text-xs">
                      {Object.entries(cpaDoc.assembly_variables).map(([k, v]) => (
                        <div key={k} className="flex gap-2"><code className="text-primary font-mono">{k}:</code><span className="text-muted-foreground truncate">{String(v)}</span></div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              {editing ? (
                <div className="space-y-2">
                  <RichTextEditor value={editContent} onChange={setEditContent} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/50 rounded p-3 max-h-[300px] overflow-y-auto prose prose-sm" dangerouslySetInnerHTML={{ __html: cpaDoc.content ?? 'No content' }} />
                  <Button size="sm" variant="outline" onClick={() => handleStartEdit(cpaDoc)}>Edit Content</Button>
                </div>
              )}
            </>
          )}

          <LcAddendumUpload challengeId={challengeId} />

          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approving || !cpaDoc}>
              {approving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Approve Legal & Publish
            </Button>
            <Button size="sm" variant="ghost" className="w-full text-amber-600" onClick={() => setShowReturnDialog(true)}>
              <Unlock className="h-4 w-4 mr-1.5" />Unlock for Re-curation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return to Curation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for returning (min 10 characters)</Label>
            <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Explain why the challenge needs re-curation…" className="min-h-[100px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>Cancel</Button>
            <Button onClick={handleReturn} disabled={returnReason.trim().length < 10 || unfreezeMut.isPending}>
              {unfreezeMut.isPending ? 'Returning…' : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
