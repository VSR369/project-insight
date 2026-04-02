/**
 * SolutionSubmitFormSections — Form card sections and legal modal for SolutionSubmitPage.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollToAcceptLegal } from '@/components/cogniblend/solver/ScrollToAcceptLegal';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { toast } from 'sonner';
import {
  FormField, FormItem, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  FileText, Shield, Save, Send, ArrowLeft, AlertTriangle, Download,
} from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { AbstractFormValues } from './SolutionSubmitConstants';
import { TIMELINE_OPTIONS, FILE_UPLOAD_CONFIG, MAX_TOTAL_FILE_SIZE } from './SolutionSubmitConstants';

/* ── Header ────────────────────────────────────────────── */

interface HeaderProps {
  challengeTitle: string;
  onBack: () => void;
}

export function SolutionSubmitHeader({ challengeTitle, onBack }: HeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-foreground truncate">Submit Solution Abstract</h1>
        <p className="text-sm text-muted-foreground truncate">{challengeTitle}</p>
      </div>
    </div>
  );
}

/* ── Legal Gate Banner ─────────────────────────────────── */

interface LegalBannerProps {
  missingCount: number;
  onReview: () => void;
}

export function LegalGateBanner({ missingCount, onReview }: LegalBannerProps) {
  return (
    <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Legal Acceptance Required</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You must accept {missingCount} Tier 2 legal document{missingCount > 1 ? 's' : ''} before submitting.
          </p>
        </div>
        <Button size="sm" onClick={onReview}>Review & Accept</Button>
      </CardContent>
    </Card>
  );
}

/* ── Template Download Banner ──────────────────────────── */

export function TemplateDownloadBanner({ url }: { url: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Submission Template Available</p>
          <p className="text-xs text-muted-foreground">Use this template to structure your submission.</p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-4 w-4 mr-1.5" />
            Download Template
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Abstract Form Fields ──────────────────────────────── */

interface FormFieldsProps {
  form: UseFormReturn<AbstractFormValues>;
  attachedFiles: File[];
  onFilesChange: (files: File[]) => void;
  isQuick: boolean;
  isEnterprise: boolean;
}

export function SolutionFormFields({ form, attachedFiles, onFilesChange, isQuick, isEnterprise }: FormFieldsProps) {
  const abstractTextValue = form.watch('abstractText');
  const methodologyValue = form.watch('methodology');
  const totalFileSize = attachedFiles.reduce((sum, f) => sum + f.size, 0);
  const fileSizeExceeded = totalFileSize > MAX_TOTAL_FILE_SIZE;

  return (
    <>
      {/* Approach Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Approach Summary</CardTitle>
          <CardDescription>Describe your proposed approach (min 200 characters)</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField control={form.control} name="abstractText" render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea {...field} placeholder="Describe your approach to solving this challenge..." rows={6} className="text-base" />
              </FormControl>
              <div className="flex justify-between items-center mt-1">
                <FormMessage />
                <span className={`text-xs ${(abstractTextValue?.length ?? 0) >= 200 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {abstractTextValue?.length ?? 0} / 200 min
                </span>
              </div>
            </FormItem>
          )} />
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Proposed Methodology</CardTitle>
          <CardDescription>Outline your methodology (min 100 characters)</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField control={form.control} name="methodology" render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea {...field} placeholder="Describe the methodology you plan to follow..." rows={4} className="text-base" />
              </FormControl>
              <div className="flex justify-between items-center mt-1">
                <FormMessage />
                <span className={`text-xs ${(methodologyValue?.length ?? 0) < 100 ? 'text-muted-foreground' : 'text-primary'}`}>
                  {methodologyValue?.length ?? 0} / 100 min
                </span>
              </div>
            </FormItem>
          )} />
        </CardContent>
      </Card>

      {/* Timeline & Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Estimated Timeline</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="timeline" render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Relevant Experience</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="experience" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea {...field} placeholder="Describe relevant experience..." rows={3} className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
          <FormField control={form.control} name="aiUsageDeclaration" render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea {...field} placeholder="List AI tools used or write None" rows={2} className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </CardContent>
      </Card>

      {/* File Attachments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {isQuick ? 'Solution Files' : 'File Attachments'}
            <span className="text-xs text-muted-foreground font-normal">
              {isQuick
                ? '(Optional — attach solution files for direct owner review, max 10 files, 50MB total)'
                : '(Optional, max 10 files, 50MB total)'}
            </span>
          </CardTitle>
          {isQuick && (
            <CardDescription>
              Quick-mode challenges use single-stage submission. Your solution files are reviewed directly by the challenge owner — no screening step.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <FileUploadZone
            config={FILE_UPLOAD_CONFIG}
            multiple
            files={attachedFiles}
            onFilesChange={(files) => {
              if (files.length > 10) { toast.error('Maximum 10 files allowed'); return; }
              onFilesChange(files);
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

      {/* Enterprise Info Banner */}
      {isEnterprise && (
        <Card className="border-muted bg-muted/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong>Enterprise two-stage submission:</strong> Your abstract will be screened first. If shortlisted, you will be notified to upload your full solution with deliverable files.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ── Form Action Buttons ───────────────────────────────── */

interface FormActionsProps {
  onSaveDraft: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  needsLegalAcceptance: boolean;
  fileSizeExceeded: boolean;
  isQuick: boolean;
}

export function SolutionFormActions({ onSaveDraft, isSaving, isSubmitting, needsLegalAcceptance, fileSizeExceeded, isQuick }: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-3 justify-end">
      <Button type="button" variant="outline" onClick={onSaveDraft} disabled={isSaving}>
        <Save className="h-4 w-4 mr-2" /> Save Draft
      </Button>
      <Button type="submit" disabled={isSubmitting || needsLegalAcceptance || fileSizeExceeded}>
        <Send className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Submitting...' : isQuick ? 'Submit Solution' : 'Submit Abstract'}
      </Button>
    </div>
  );
}

/* ── Legal Acceptance Modal ────────────────────────────── */

interface LegalModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentDoc: { type: string; name: string; content: string } | undefined;
  currentIdx: number;
  totalDocs: number;
  accepted: Record<string, boolean>;
  onAcceptedChange: (type: string, v: boolean) => void;
  onAccept: () => void;
  isPending: boolean;
}

export function LegalAcceptanceModal({
  open, onOpenChange, currentDoc, currentIdx, totalDocs,
  accepted, onAcceptedChange, onAccept, isPending,
}: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {currentDoc?.name ?? 'Legal Document'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Document {currentIdx + 1} of {totalDocs}
          </p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {currentDoc && (
            <ScrollToAcceptLegal
              documentContent={currentDoc.content}
              accepted={!!accepted[currentDoc.type]}
              onAcceptedChange={(v) => onAcceptedChange(currentDoc.type, v)}
              acceptLabel={`I have read and agree to the ${currentDoc.name}.`}
            />
          )}
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onAccept}
            disabled={!accepted[currentDoc?.type ?? ''] || isPending}
          >
            {currentIdx < totalDocs - 1 ? 'Accept & Next' : 'Accept & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
