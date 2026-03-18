/**
 * FullSolutionUploadPage — /cogni/challenges/:id/solutions/:solId/upload
 * Enterprise Stage 2: Upload full solution files after abstract shortlisting.
 * Shows deliverables checklist, per-deliverable upload, deadline countdown.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CACHE_STANDARD } from '@/config/queryCache';
import {
  useShortlistStatus,
  useUploadSolutionFile,
  useMarkFullSolutionUploaded,
  type DeliverableUpload,
} from '@/hooks/cogniblend/useFullSolutionUpload';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  X,
  Shield,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────── */

function formatCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Deadline passed';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function parseDeliverables(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(String) : []; }
    catch { return []; }
  }
  return [];
}

/* ─── Page Component ─────────────────────────────────────── */

export default function FullSolutionUploadPage() {
  // ═══ SECTION 1: useState ═══
  const [deliverableUploads, setDeliverableUploads] = useState<DeliverableUpload[]>([]);
  const [countdown, setCountdown] = useState('');

  // ═══ SECTION 2: Context ═══
  const { id: challengeId, solId } = useParams<{ id: string; solId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  // ═══ SECTION 3: Queries ═══
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['challenge-full-upload', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, deliverables, submission_deadline, governance_profile, phase_schedule')
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const { data: shortlistStatus, isLoading: shortlistLoading } = useShortlistStatus(challengeId, userId);

  const uploadFileMutation = useUploadSolutionFile();
  const markUploadedMutation = useMarkFullSolutionUploaded();

  // ═══ SECTION 4: useEffect ═══
  // Initialize deliverable upload slots from challenge deliverables
  useEffect(() => {
    if (challenge?.deliverables && deliverableUploads.length === 0) {
      const items = parseDeliverables(challenge.deliverables);
      setDeliverableUploads(
        items.map(name => ({
          deliverableName: name,
          file: null,
          uploadedUrl: null,
          isUploading: false,
        }))
      );
    }
  }, [challenge?.deliverables, deliverableUploads.length]);

  // Countdown timer
  useEffect(() => {
    if (!challenge?.submission_deadline) return;
    const update = () => setCountdown(formatCountdown(challenge.submission_deadline!));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [challenge?.submission_deadline]);

  // ═══ SECTION 5: Derived ═══
  const isLoading = challengeLoading || shortlistLoading;
  const isShortlisted = shortlistStatus?.isShortlisted === true;
  const alreadyUploaded = shortlistStatus?.phaseStatus === 'FULL_UPLOADED';
  const deadlinePassed = challenge?.submission_deadline
    ? new Date(challenge.submission_deadline).getTime() < Date.now()
    : false;

  const uploadedCount = deliverableUploads.filter(d => d.uploadedUrl).length;
  const totalDeliverables = deliverableUploads.length;
  const uploadProgress = totalDeliverables > 0 ? (uploadedCount / totalDeliverables) * 100 : 0;
  const allUploaded = uploadedCount === totalDeliverables && totalDeliverables > 0;
  const anyUploading = deliverableUploads.some(d => d.isUploading);

  // ═══ Conditional returns ═══
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!isShortlisted && !alreadyUploaded) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Not Shortlisted</h2>
            <p className="text-muted-foreground">
              Your abstract must be shortlisted before you can upload the full solution.
            </p>
            <Button variant="outline" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyUploaded) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Full Solution Uploaded</h2>
            <Badge variant="secondary" className="text-sm">Uploaded — Awaiting Evaluation</Badge>
            <p className="text-muted-foreground">
              Your full solution has been submitted for evaluation.
            </p>
            <Button variant="outline" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ SECTION 6: Handlers ═══
  const handleFileSelect = (index: number, file: File | null) => {
    setDeliverableUploads(prev =>
      prev.map((d, i) => i === index ? { ...d, file, uploadedUrl: null } : d)
    );
  };

  const handleUploadFile = async (index: number) => {
    const item = deliverableUploads[index];
    if (!item.file || !solId || !userId) return;

    setDeliverableUploads(prev =>
      prev.map((d, i) => i === index ? { ...d, isUploading: true } : d)
    );

    try {
      const result = await uploadFileMutation.mutateAsync({
        solutionId: solId,
        userId,
        deliverableName: item.deliverableName,
        file: item.file,
      });

      setDeliverableUploads(prev =>
        prev.map((d, i) =>
          i === index ? { ...d, uploadedUrl: result.url, isUploading: false } : d
        )
      );
    } catch {
      setDeliverableUploads(prev =>
        prev.map((d, i) => i === index ? { ...d, isUploading: false } : d)
      );
    }
  };

  const handleRemoveFile = (index: number) => {
    setDeliverableUploads(prev =>
      prev.map((d, i) => i === index ? { ...d, file: null, uploadedUrl: null } : d)
    );
  };

  const handleFinalSubmit = async () => {
    if (!allUploaded || !solId || !challengeId) return;

    const uploadedFiles = deliverableUploads
      .filter(d => d.uploadedUrl)
      .map(d => ({
        deliverableName: d.deliverableName,
        url: d.uploadedUrl!,
        fileName: d.file?.name ?? 'unknown',
        fileSize: d.file?.size ?? 0,
      }));

    markUploadedMutation.mutate({
      solutionId: solId,
      challengeId,
      uploadedFiles,
    });
  };

  // ═══ SECTION 7: Render ═══
  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">Upload Full Solution</h1>
          <p className="text-sm text-muted-foreground truncate">{challenge?.title ?? 'Challenge'}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          <Shield className="h-3 w-3 mr-1" /> Enterprise
        </Badge>
      </div>

      {/* Shortlist Congratulations */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Your abstract has been shortlisted!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload your full solution files for each deliverable listed below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Deadline Countdown */}
      {challenge?.submission_deadline && (
        <Card className={deadlinePassed ? 'border-destructive/40' : 'border-border'}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className={`h-5 w-5 shrink-0 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Submission Deadline</p>
              <p className={`text-xs ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`}>
                {new Date(challenge.submission_deadline).toLocaleString()} — {countdown}
              </p>
            </div>
            {deadlinePassed && (
              <Badge variant="destructive" className="shrink-0">Expired</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Deliverables Checklist</span>
            <span className="text-sm font-normal text-muted-foreground">
              {uploadedCount} / {totalDeliverables} uploaded
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={uploadProgress} className="h-2 mb-4" />

          <div className="space-y-4">
            {deliverableUploads.map((item, index) => (
              <div
                key={`${item.deliverableName}-${index}`}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                {/* Deliverable header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.uploadedUrl ? (
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground">{item.deliverableName}</span>
                  </div>
                  {item.uploadedUrl && (
                    <Badge variant="secondary" className="text-[10px]">Uploaded</Badge>
                  )}
                </div>

                {/* File selection / upload */}
                {!item.uploadedUrl ? (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {item.file ? item.file.name : 'Click to select file'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          handleFileSelect(index, f);
                          e.target.value = '';
                        }}
                        disabled={deadlinePassed}
                      />
                    </label>

                    {item.file && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground flex-1 truncate">
                          {item.file.name} ({(item.file.size / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFile(index)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUploadFile(index)}
                          disabled={item.isUploading || deadlinePassed}
                        >
                          {item.isUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="truncate">{item.file?.name ?? 'File uploaded'}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => handleRemoveFile(index)}
                    >
                      Replace
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {totalDeliverables === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No deliverables defined for this challenge.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onClick={handleFinalSubmit}
          disabled={!allUploaded || deadlinePassed || anyUploading || markUploadedMutation.isPending}
          className="min-w-[200px]"
        >
          <Upload className="h-4 w-4 mr-2" />
          {markUploadedMutation.isPending ? 'Submitting...' : 'Submit Full Solution'}
        </Button>
      </div>
    </div>
  );
}
