/**
 * CreatorLegalPreview — Read-only preview of solver-facing legal agreements.
 * Shows CPA template (governance-specific) and SPA footnote.
 * STRUCTURED/CONTROLLED: includes Creator Legal Instructions textarea.
 */

import { useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FileText, Shield, Eye, Loader2, AlertTriangle, Info, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { useOrgCpaTemplates } from '@/hooks/queries/useOrgCpaTemplates';
import { usePlatformSpaTemplate } from '@/hooks/queries/usePlatformSpaTemplate';
import type { GovernanceMode } from '@/lib/governanceMode';
import { SOURCE_DOC_CONFIG } from '@/services/legal/sourceDocService';
import type { QuickLegalOverrideRow } from '@/hooks/queries/useQuickLegalOverride';
import type { CreatorFormValues } from './creatorFormSchema';

interface CreatorLegalPreviewProps {
  governanceMode: GovernanceMode;
  organizationId?: string;
  challengeId?: string;
  quickLegalOverride?: QuickLegalOverrideRow | null;
  quickOverrideMode?: 'KEEP_DEFAULT' | 'REPLACE_DEFAULT';
  onQuickOverrideModeChange?: (nextMode: 'KEEP_DEFAULT' | 'REPLACE_DEFAULT') => Promise<void>;
  onQuickOverrideUpload?: (file: File) => Promise<void>;
  isQuickOverrideBusy?: boolean;
}

const MODE_CONFIG: Record<GovernanceMode, { color: string; badge: string; badgeClass: string; borderClass: string }> = {
  QUICK: { color: 'text-emerald-600', badge: 'Auto-accepted', badgeClass: 'text-emerald-700 border-emerald-300 bg-emerald-50', borderClass: 'border-emerald-200' },
  STRUCTURED: { color: 'text-blue-600', badge: 'Curator-reviewed', badgeClass: 'text-blue-700 border-blue-300 bg-blue-50', borderClass: 'border-blue-200' },
  CONTROLLED: { color: 'text-purple-600', badge: 'LC-reviewed', badgeClass: 'text-purple-700 border-purple-300 bg-purple-50', borderClass: 'border-purple-200' },
};

const CPA_DESCRIPTIONS: Record<GovernanceMode, string> = {
  QUICK: 'Assembled automatically from your org\'s CPA-Quick template with this challenge\'s details (IP model, prize, jurisdiction). Solution Providers auto-accept at enrollment. No manual review.',
  STRUCTURED: 'Assembled after curation freeze from your org\'s CPA-Structured template. The Curator reviews, can edit legal terms, and optionally add addenda before publishing.',
  CONTROLLED: 'Assembled after curation freeze from your org\'s CPA-Controlled template. The Legal Coordinator reviews with AI assistance, can edit terms, add addenda, and must approve.',
};

const INSTRUCTIONS_PLACEHOLDERS: Record<string, string> = {
  STRUCTURED: 'e.g., This challenge involves regulated medical data — please ensure HIPAA compliance clauses are included. Our client requires a specific non-compete clause...',
  CONTROLLED: 'e.g., Export control restrictions apply — ITAR compliance required. The client\'s legal team requires mandatory arbitration in Singapore jurisdiction...',
};

export function CreatorLegalPreview({
  governanceMode,
  organizationId,
  challengeId,
  quickLegalOverride,
  quickOverrideMode = 'KEEP_DEFAULT',
  onQuickOverrideModeChange,
  onQuickOverrideUpload,
  isQuickOverrideBusy = false,
}: CreatorLegalPreviewProps) {
  const form = useFormContext<CreatorFormValues>();
  const { data: cpaTemplates = [], isLoading: cpaLoading } = useOrgCpaTemplates(organizationId ?? '');
  const { data: spaTemplate, isLoading: spaLoading } = usePlatformSpaTemplate();
  const [viewingDoc, setViewingDoc] = useState<{ name: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const config = MODE_CONFIG[governanceMode];
  const cpaCode = `CPA_${governanceMode}`;
  const cpaTemplate = cpaTemplates.find(t => t.document_code === cpaCode);
  const isQuick = governanceMode === 'QUICK';
  const showInstructions = !isQuick;
  const instructions = form?.watch('creator_legal_instructions') ?? '';
  const effectiveQuickContent = quickLegalOverride?.content_html ?? cpaTemplate?.template_content ?? null;
  const effectiveQuickName = quickLegalOverride?.document_name ?? cpaTemplate?.document_name ?? 'Challenge Participation Agreement';

  const handleQuickUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onQuickOverrideUpload) return;
    await onQuickOverrideUpload(file);
  };

  if (cpaLoading || spaLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading legal template preview…
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Solution Provider Legal Agreements (Preview)
          </h3>
          <p className="text-xs text-muted-foreground">
            Preview of legal agreements Solution Providers will accept when enrolling.
            {isQuick
              ? ' In Quick mode you can keep the default CPA or replace it for this challenge only.'
              : ' These are assembled automatically — no action needed from you.'}
          </p>
        </div>

        {isQuick && (
          <div className="rounded-lg border border-border bg-background/60 p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Quick challenge legal option</p>
              <p className="text-xs text-muted-foreground">
                This affects only this challenge. Your organization template stays unchanged.
              </p>
            </div>

            <RadioGroup
              value={quickOverrideMode}
              onValueChange={(value) => {
                void onQuickOverrideModeChange?.(value as 'KEEP_DEFAULT' | 'REPLACE_DEFAULT');
              }}
              className="grid gap-2"
            >
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/50">
                <RadioGroupItem value="KEEP_DEFAULT" id="quick-legal-keep" className="mt-0.5" />
                <div>
                  <Label htmlFor="quick-legal-keep" className="text-sm font-medium cursor-pointer">Keep default document</Label>
                  <p className="text-xs text-muted-foreground">Use the organization’s standard CPA_QUICK template for this challenge.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/50">
                <RadioGroupItem value="REPLACE_DEFAULT" id="quick-legal-replace" className="mt-0.5" />
                <div>
                  <Label htmlFor="quick-legal-replace" className="text-sm font-medium cursor-pointer">Replace default for this challenge</Label>
                  <p className="text-xs text-muted-foreground">Upload a DOCX or TXT file to use instead of the default Quick CPA for this one challenge.</p>
                </div>
              </label>
            </RadioGroup>

            {quickOverrideMode === 'REPLACE_DEFAULT' && (
              <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Challenge-specific replacement</p>
                    <p className="text-xs text-muted-foreground">Allowed formats: {SOURCE_DOC_CONFIG.allowedExtensions.join(', ')} · {SOURCE_DOC_CONFIG.maxSizeMB} MB max.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={SOURCE_DOC_CONFIG.allowedExtensions.join(',')}
                      className="hidden"
                      onChange={(event) => {
                        void handleQuickUploadChange(event);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isQuickOverrideBusy}
                    >
                      {quickLegalOverride ? <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                      {quickLegalOverride ? 'Replace file' : 'Upload file'}
                    </Button>
                    {quickLegalOverride && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void onQuickOverrideModeChange?.('KEEP_DEFAULT');
                        }}
                        disabled={isQuickOverrideBusy}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove
                      </Button>
                    )}
                  </div>
                </div>

                {challengeId ? null : (
                  <p className="text-xs text-muted-foreground">The challenge draft will be saved automatically before the replacement file is attached.</p>
                )}

                {quickLegalOverride ? (
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 flex items-center gap-2 text-xs text-foreground">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{quickLegalOverride.document_name ?? 'Uploaded replacement document'}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">Challenge override</Badge>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    No replacement uploaded yet. Solution Providers will continue to see the default Quick CPA until you upload one.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CPA Card */}
        <div className={`rounded-lg border ${config.borderClass} p-4 space-y-2`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className={`h-4 w-4 shrink-0 ${config.color}`} />
              <span className="text-sm font-medium text-foreground">Challenge Participation Agreement ({governanceMode.charAt(0) + governanceMode.slice(1).toLowerCase()})</span>
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${config.badgeClass}`}>{config.badge}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isQuick && quickLegalOverride
              ? 'A challenge-specific replacement is active for this Quick challenge. It does not modify the organization template.'
              : CPA_DESCRIPTIONS[governanceMode]}
          </p>
          {cpaTemplate ? (
            effectiveQuickContent ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewingDoc({ name: effectiveQuickName, content: effectiveQuickContent ?? '' })}>
                <Eye className="h-3 w-3" />View Template
              </Button>
            ) : null
          ) : isQuick && quickLegalOverride ? (
            effectiveQuickContent && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewingDoc({ name: effectiveQuickName, content: effectiveQuickContent ?? '' })}>
                <Eye className="h-3 w-3" />View Template
              </Button>
            )
          ) : (
            <div className="rounded-md border border-border bg-muted/40 p-2 flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
               <span>No CPA template found for {governanceMode} governance. Org Admin must create one in Organization Settings → Legal Templates.</span>
            </div>
          )}
          {isQuick && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>{quickLegalOverride ? 'Challenge-specific replacement in use' : 'Default template in use'}</span>
            </div>
          )}
        </div>

        {/* Addendum note */}
        {!isQuick && (
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              {governanceMode === 'STRUCTURED'
                ? 'The Curator can add challenge-specific addenda during legal review if standard CPA terms are insufficient.'
                : 'The LC can add addenda. The FC must also confirm escrow funding before publication.'}
            </p>
          </div>
        )}

        {/* Creator Legal Instructions */}
        {showInstructions && form && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="creator-legal-instructions" className="text-sm font-medium">Legal Instructions for Reviewer</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">Optional notes for the {governanceMode === 'STRUCTURED' ? 'Curator' : 'Legal Coordinator'} to consider when reviewing legal documents.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="creator-legal-instructions"
              {...form.register('creator_legal_instructions')}
              placeholder={INSTRUCTIONS_PLACEHOLDERS[governanceMode] ?? ''}
              maxLength={2000}
              className="min-h-[80px] text-sm"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Shown to the {governanceMode === 'STRUCTURED' ? 'Curator' : 'LC'} as guidance — not included in the CPA shown to Solution Providers.</span>
              <span>{instructions.length}/2000</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground">The CPA is assembled using your challenge configuration: IP model, prize amount, currency, evaluation method, and jurisdiction.</p>

        {/* SPA footnote */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield className="h-3 w-3 shrink-0" />
          <span>Solution Providers also accept the Solution Provider Platform Agreement (SPA) at registration, covering platform usage and data privacy.</span>
          {spaTemplate?.content && (
            <button type="button" className="text-primary hover:underline" onClick={() => setViewingDoc({ name: 'Solution Provider Platform Agreement', content: spaTemplate.content ?? '' })}>View</button>
          )}
        </div>
      </div>

      {viewingDoc && (
        <Dialog open onOpenChange={() => setViewingDoc(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>{viewingDoc.name}</DialogTitle>
              <DialogDescription>
                Review the effective document content that Solution Providers will see for this agreement.
              </DialogDescription>
            </DialogHeader>
            <p className="text-xs text-muted-foreground px-1">Variables like {'{{challenge_title}}'}, {'{{ip_clause}}'}, {'{{prize_amount}}'} are auto-filled from your challenge configuration.</p>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <LegalDocumentViewer content={viewingDoc.content} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
