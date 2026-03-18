/**
 * SolutionSubmitPage — /cogni/challenges/:id/submit
 * Solver abstract submission with enrollment gate, Tier 2 legal gate, and form.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useSolverEnrollmentStatus } from '@/hooks/cogniblend/useSolverEnrollment';
import {
  useTier2LegalStatus,
  useSolverSolution,
  useSaveSolutionDraft,
  useSubmitSolution,
} from '@/hooks/cogniblend/useSolutionSubmission';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CACHE_STANDARD } from '@/config/queryCache';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollToAcceptLegal } from '@/components/cogniblend/solver/ScrollToAcceptLegal';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { toast } from 'sonner';
import {
  FileText,
  Shield,
  ArrowLeft,
  Save,
  Send,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

/* ─── Constants ──────────────────────────────────────────── */

const MAX_TOTAL_FILE_SIZE = 50 * 1024 * 1024; // 50MB total

const FILE_UPLOAD_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ] as const,
  allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.png', '.webp'] as const,
  label: '10MB per file',
};

const TIER_2_DOCUMENTS = [
  {
    type: 'SOLUTION_EVALUATION_CONSENT',
    name: 'Solution Evaluation Consent',
    content: `SOLUTION EVALUATION CONSENT AGREEMENT

By submitting a solution abstract to this challenge, you consent to the following evaluation process:

1. EVALUATION SCOPE
Your submitted abstract and supporting materials will be reviewed by qualified evaluators selected by the platform. Evaluation criteria include originality, feasibility, methodology, and alignment with the challenge requirements.

2. CONFIDENTIALITY OF EVALUATION
Evaluator identities remain anonymous to solvers. Evaluation scores and commentary are confidential until officially released by the challenge owner.

3. MULTI-ROUND REVIEW
Solutions may undergo multiple rounds of evaluation including automated screening, peer review, and expert panel assessment. You consent to your submission being evaluated across all applicable rounds.

4. FEEDBACK AND SCORING
Aggregate scores and optional written feedback may be shared with you after evaluation is complete. Individual evaluator scores are not disclosed.

5. NO GUARANTEE OF SELECTION
Submission and evaluation do not guarantee selection, award, or compensation. The challenge owner retains sole discretion in final selection decisions.

6. DATA RETENTION
Your submission data will be retained for the duration of the challenge lifecycle plus 12 months for audit purposes.`,
  },
  {
    type: 'AI_USAGE_POLICY',
    name: 'AI Usage Policy',
    content: `AI USAGE POLICY FOR SOLUTION SUBMISSIONS

This policy governs the use of artificial intelligence tools in preparing and submitting solutions.

1. DISCLOSURE REQUIREMENT
All solvers MUST declare any AI tools used in the preparation of their solution. This includes but is not limited to: large language models (ChatGPT, Claude, Gemini), code generation tools (GitHub Copilot), image generators, and research assistants.

2. PERMITTED USES
AI tools may be used for: research assistance, grammar and writing refinement, code scaffolding (where applicable), data analysis support, and visualization generation.

3. PROHIBITED USES
The following AI uses are prohibited: submitting AI-generated content as entirely original work without disclosure, using AI to circumvent plagiarism detection, automated mass-submission of solutions, and using AI to reverse-engineer or plagiarize other submissions.

4. VERIFICATION
The platform reserves the right to verify AI usage declarations through technical analysis. Undisclosed AI usage may result in disqualification.

5. PENALTIES FOR NON-COMPLIANCE
First offense: Warning and mandatory revised declaration.
Second offense: Solution disqualification from the current challenge.
Third offense: Account suspension and platform review.`,
  },
  {
    type: 'DISPUTE_AGREEMENT',
    name: 'Dispute Resolution Agreement',
    content: `DISPUTE RESOLUTION AGREEMENT

This agreement establishes the framework for resolving disputes arising from challenge participation.

1. SCOPE
This agreement covers disputes related to: evaluation fairness, intellectual property claims, payment processing, eligibility decisions, and challenge rule interpretation.

2. INFORMAL RESOLUTION (FIRST STEP)
Parties shall first attempt to resolve disputes through the platform's messaging system within 14 days of the dispute arising.

3. MEDIATION (SECOND STEP)
If informal resolution fails, either party may request platform-mediated resolution. A neutral platform mediator will be assigned within 5 business days.

4. BINDING ARBITRATION (FINAL STEP)
Unresolved disputes after mediation proceed to binding arbitration. The arbitrator's decision is final and enforceable.

5. TIMELINE
All disputes must be raised within 30 days of the triggering event. Failure to raise a dispute within this period constitutes waiver of the claim.

6. COSTS
Each party bears their own costs. Platform mediation is provided at no charge. Arbitration fees are split equally unless the arbitrator determines otherwise.`,
  },
  {
    type: 'WITHDRAWAL_TERMS',
    name: 'Withdrawal Terms',
    content: `SOLUTION WITHDRAWAL TERMS

These terms govern the process and implications of withdrawing a submitted solution.

1. WITHDRAWAL WINDOW
Solvers may withdraw their submission without penalty during the Screening phase (Phase 7). Once the submission advances to Evaluation (Phase 8), withdrawal restrictions apply.

2. POST-EVALUATION WITHDRAWAL
Withdrawing after evaluation begins may result in: forfeiture of any evaluation feedback, notation on the solver's platform record, and temporary cooldown period before submitting to new challenges.

3. IP IMPLICATIONS
Upon withdrawal: all IP rights revert to the solver, the platform retains no license to the withdrawn submission, and all copies in the evaluation system are purged within 30 days.

4. PARTIAL WITHDRAWAL
In team submissions, individual members may withdraw their contribution. The remaining team must confirm they can proceed without the withdrawn contribution.

5. RE-SUBMISSION
A withdrawn solution may be re-submitted if the challenge deadline has not passed and the submission limit has not been reached.

6. NOTIFICATION
Withdrawal notifications are sent to the challenge owner and any assigned evaluators. The solver's identity in connection with the withdrawal remains confidential.`,
  },
];

/* ─── Zod Schema ─────────────────────────────────────────── */

const abstractFormSchema = z.object({
  abstractText: z.string().min(200, 'Approach Summary must be at least 200 characters'),
  methodology: z.string().min(100, 'Proposed Methodology must be at least 100 characters'),
  timeline: z.string().min(1, 'Please select an estimated timeline'),
  experience: z.string().min(1, 'Relevant Experience is required'),
  aiUsageDeclaration: z.string().min(4, 'AI Usage Declaration is required (min 4 characters)'),
});

type AbstractFormValues = z.infer<typeof abstractFormSchema>;

/* ─── Timeline Options ───────────────────────────────────── */

const TIMELINE_OPTIONS = [
  { value: '1-2_weeks', label: '1–2 Weeks' },
  { value: '2-4_weeks', label: '2–4 Weeks' },
  { value: '1-2_months', label: '1–2 Months' },
  { value: '2-3_months', label: '2–3 Months' },
  { value: '3-6_months', label: '3–6 Months' },
  { value: '6+_months', label: '6+ Months' },
];

/* ─── Page Component ─────────────────────────────────────── */

export default function SolutionSubmitPage() {
  // ═══ SECTION 1: useState ═══
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [currentLegalIdx, setCurrentLegalIdx] = useState(0);
  const [legalAccepted, setLegalAccepted] = useState<Record<string, boolean>>({});
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // ═══ SECTION 2: Context and hooks ═══
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  // ═══ SECTION 3: Form ═══
  const form = useForm<AbstractFormValues>({
    resolver: zodResolver(abstractFormSchema),
    defaultValues: {
      abstractText: '',
      methodology: '',
      timeline: '',
      experience: '',
      aiUsageDeclaration: '',
    },
  });

  // ═══ SECTION 4: Queries & Mutations ═══
  const { data: enrollment, isLoading: enrollmentLoading } = useSolverEnrollmentStatus(challengeId, userId);
  const { data: tier2Status, isLoading: tier2Loading } = useTier2LegalStatus(challengeId, userId);
  const { data: existingSolution, isLoading: solutionLoading } = useSolverSolution(challengeId, userId);

  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['challenge-for-submit', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, phase_schedule, operating_model, governance_profile, deliverables, submission_deadline')
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const saveDraftMutation = useSaveSolutionDraft();
  const submitMutation = useSubmitSolution();
  const legalMutation = useRecordLegalAcceptance();

  // ═══ SECTION 5: useEffect ═══
  useEffect(() => {
    if (existingSolution) {
      form.reset({
        abstractText: existingSolution.abstract_text ?? '',
        methodology: existingSolution.methodology ?? '',
        timeline: existingSolution.timeline ?? '',
        experience: existingSolution.experience ?? '',
        aiUsageDeclaration: existingSolution.ai_usage_declaration ?? '',
      });
    }
  }, [existingSolution, form]);

  // ═══ SECTION 6: Derived / Computed ═══
  const isLoading = enrollmentLoading || tier2Loading || solutionLoading || challengeLoading;
  const isEnrolled = enrollment?.status === 'APPROVED';
  const isAlreadySubmitted = existingSolution?.phase_status === 'ACTIVE' && !!existingSolution?.submitted_at;
  const isLightweight = challenge?.governance_profile === 'LIGHTWEIGHT';
  const isEnterprise = challenge?.governance_profile === 'ENTERPRISE';
  const needsLegalAcceptance = tier2Status && !tier2Status.allAccepted;
  const missingDocs = useMemo(
    () => TIER_2_DOCUMENTS.filter(d => tier2Status?.missing?.includes(d.type)),
    [tier2Status]
  );

  const abstractTextValue = form.watch('abstractText');
  const methodologyValue = form.watch('methodology');

  const totalFileSize = attachedFiles.reduce((sum, f) => sum + f.size, 0);
  const fileSizeExceeded = totalFileSize > MAX_TOTAL_FILE_SIZE;

  // ═══ Conditional returns ═══
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Enrollment Required</h2>
            <p className="text-muted-foreground">
              You must be enrolled and approved for this challenge before submitting a solution.
            </p>
            <Button onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
              Go to Challenge & Enroll
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAlreadySubmitted) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              {isEnterprise ? 'Abstract Submitted' : 'Solution Submitted'}
            </h2>
            <Badge variant="secondary" className="text-sm">
              {isEnterprise ? 'Submitted — Awaiting Screening' : 'Submitted — Awaiting Owner Review'}
            </Badge>
            <p className="text-muted-foreground">
              Your {isEnterprise ? 'abstract' : 'solution'} was submitted on {existingSolution?.submitted_at ? new Date(existingSolution.submitted_at).toLocaleDateString() : 'N/A'}.
            </p>
            {isEnterprise && (
              <p className="text-xs text-muted-foreground">
                If shortlisted, you will be notified to upload your full solution.
              </p>
            )}
            <Button variant="outline" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ SECTION 7: Handlers ═══
  const handleOpenLegalGate = () => {
    if (needsLegalAcceptance && missingDocs.length > 0) {
      setCurrentLegalIdx(0);
      setLegalAccepted({});
      setLegalModalOpen(true);
    }
  };

  const handleLegalDocAccept = async () => {
    const currentDoc = missingDocs[currentLegalIdx];
    if (!currentDoc || !userId || !challengeId) return;

    try {
      await legalMutation.mutateAsync({
        challengeId,
        userId,
        documentType: currentDoc.type,
        documentName: currentDoc.name,
        tier: 'TIER_2',
        phaseTriggered: 7,
        scrollConfirmed: true,
      });

      const nextIdx = currentLegalIdx + 1;
      if (nextIdx < missingDocs.length) {
        setCurrentLegalIdx(nextIdx);
        setLegalAccepted(prev => ({ ...prev, [currentDoc.type]: true }));
      } else {
        setLegalModalOpen(false);
        toast.success('All legal documents accepted. You may now submit.');
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleSaveDraft = () => {
    const values = form.getValues();
    saveDraftMutation.mutate({
      existingId: existingSolution?.id,
      challengeId: challengeId!,
      providerId: userId!,
      ...values,
    });
  };

  const handleSubmit = async (values: AbstractFormValues) => {
    if (fileSizeExceeded) {
      toast.error('Total file size exceeds 50MB limit.');
      return;
    }

    submitMutation.mutate({
      existingId: existingSolution?.id,
      challengeId: challengeId!,
      providerId: userId!,
      abstractText: values.abstractText,
      methodology: values.methodology,
      timeline: values.timeline,
      experience: values.experience,
      aiUsageDeclaration: values.aiUsageDeclaration,
    });
  };

  const currentLegalDoc = missingDocs[currentLegalIdx];

  // ═══ SECTION 8: Render ═══
  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">Submit Solution Abstract</h1>
          <p className="text-sm text-muted-foreground truncate">{challenge?.title ?? 'Challenge'}</p>
        </div>
      </div>

      {/* Legal Gate Banner */}
      {needsLegalAcceptance && (
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Legal Acceptance Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You must accept {missingDocs.length} Tier 2 legal document{missingDocs.length > 1 ? 's' : ''} before submitting.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenLegalGate}>
              Review & Accept
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Abstract Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Approach Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Approach Summary</CardTitle>
              <CardDescription>Describe your proposed approach (min 200 characters)</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="abstractText"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your approach to solving this challenge..."
                        rows={6}
                        className="text-base"
                      />
                    </FormControl>
                    <div className="flex justify-between items-center mt-1">
                      <FormMessage />
          <span className={`text-xs ${(abstractTextValue?.length ?? 0) >= 200 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {abstractTextValue?.length ?? 0} / 200 min
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Methodology */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Proposed Methodology</CardTitle>
              <CardDescription>Outline your methodology (min 100 characters)</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="methodology"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the methodology you plan to follow..."
                        rows={4}
                        className="text-base"
                      />
                    </FormControl>
                    <div className="flex justify-between items-center mt-1">
                      <FormMessage />
                      <span className={`text-xs ${(methodologyValue?.length ?? 0) < 100 ? 'text-muted-foreground' : 'text-primary'}`}>
                        {methodologyValue?.length ?? 0} / 100 min
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Timeline & Experience */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estimated Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMELINE_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Relevant Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe relevant experience..."
                          rows={3}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* AI Usage Declaration */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                AI Usage Declaration
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
              </CardTitle>
              <CardDescription>Transparency requirement per platform AI Usage Policy</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="aiUsageDeclaration"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="List AI tools used or write None"
                        rows={2}
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* File Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                File Attachments
                <span className="text-xs text-muted-foreground font-normal">(Optional, max 10 files, 50MB total)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <FileUploadZone
                config={FILE_UPLOAD_CONFIG}
                multiple
                files={attachedFiles}
                onFilesChange={(files) => {
                  if (files.length > 10) {
                    toast.error('Maximum 10 files allowed');
                    return;
                  }
                  setAttachedFiles(files);
                }}
                onChange={() => {}}
                disabled={attachedFiles.length >= 10}
              />
              {fileSizeExceeded && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Total file size exceeds 50MB limit ({(totalFileSize / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse lg:flex-row gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending || needsLegalAcceptance || fileSizeExceeded}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit Abstract'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Legal Acceptance Modal */}
      <Dialog open={legalModalOpen} onOpenChange={setLegalModalOpen}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {currentLegalDoc?.name ?? 'Legal Document'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Document {currentLegalIdx + 1} of {missingDocs.length}
            </p>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-2">
            {currentLegalDoc && (
              <ScrollToAcceptLegal
                documentContent={currentLegalDoc.content}
                accepted={!!legalAccepted[currentLegalDoc.type]}
                onAcceptedChange={(v) =>
                  setLegalAccepted(prev => ({ ...prev, [currentLegalDoc.type]: v }))
                }
                acceptLabel={`I have read and agree to the ${currentLegalDoc.name}.`}
              />
            )}
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setLegalModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLegalDocAccept}
              disabled={!legalAccepted[currentLegalDoc?.type ?? ''] || legalMutation.isPending}
            >
              {currentLegalIdx < missingDocs.length - 1 ? 'Accept & Next' : 'Accept & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
