import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, User, Key, Link2, Clock, CheckCircle } from "lucide-react";
import { PanelReviewerFormData, InvitationSettingsData } from "@/lib/validations/reviewer";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";

interface InvitationPreviewPanelProps {
  formData: Partial<PanelReviewerFormData>;
  invitationSettings: Partial<InvitationSettingsData>;
  generatedPassword?: string;
  isConfirmed?: boolean;
  onConfirm?: () => void;
  canConfirm?: boolean;
}

export function InvitationPreviewPanel({
  formData,
  invitationSettings,
  generatedPassword,
  isConfirmed = false,
  onConfirm,
  canConfirm = false,
}: InvitationPreviewPanelProps) {
  const { data: levels } = useExpertiseLevels(false);
  const { data: industries } = useIndustrySegments(false);

  // Get display names for selected IDs
  const selectedLevelNames = useMemo(() => {
    if (!levels || !formData.expertise_level_ids?.length) return [];
    return formData.expertise_level_ids
      .map(id => levels.find(l => l.id === id)?.name)
      .filter(Boolean);
  }, [levels, formData.expertise_level_ids]);

  const selectedIndustryNames = useMemo(() => {
    if (!industries || !formData.industry_segment_ids?.length) return [];
    return formData.industry_segment_ids
      .map(id => industries.find(i => i.id === id)?.name)
      .filter(Boolean);
  }, [industries, formData.industry_segment_ids]);

  const displayName = formData.name || "Recipient Name";
  const displayEmail = formData.email || "email@example.com";
  const displayPassword = generatedPassword || formData.password || "••••••••••••";
  const expiryDays = invitationSettings.expiry_days || 14;
  const message = invitationSettings.message || 
    "We are pleased to invite you to join our Review Panel. Your expertise will help us evaluate and qualify solution providers on our platform.";

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Invitation Preview</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* To Field */}
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">To: </span>
          <span className="text-foreground">{displayName}</span>
          <span className="text-muted-foreground"> ({displayEmail})</span>
        </div>

        {/* Subject */}
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Subject: </span>
          <span className="text-foreground">Invitation Confirmation – Review Panel Member</span>
        </div>

        <Separator />

        {/* Message Body */}
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            Hello {displayName},
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {/* Credentials Box */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Key className="h-4 w-4" />
            Your Login Credentials
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">User ID:</span>
              <code className="bg-background px-2 py-0.5 rounded text-xs">
                {displayEmail}
              </code>
            </div>
            
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Password:</span>
              <code className="bg-background px-2 py-0.5 rounded text-xs font-mono">
                {displayPassword}
              </code>
            </div>
            
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Access Link:</span>
              <span className="text-primary text-xs underline">
                platform.cogniblend.com/login
              </span>
            </div>
          </div>
        </div>

        {/* Invitation Details */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Expires in: <strong className="text-foreground">{expiryDays} days</strong></span>
        </div>

        {/* Coverage Preview */}
        {(selectedLevelNames.length > 0 || selectedIndustryNames.length > 0) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase">Review Coverage</h5>
              
              {selectedIndustryNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedIndustryNames.map((name, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
              
              {selectedLevelNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedLevelNames.map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Confirm Button */}
        <Button 
          className="w-full" 
          variant={isConfirmed ? "secondary" : "default"}
          disabled={isConfirmed || !canConfirm}
          onClick={onConfirm}
        >
          {isConfirmed ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmed
            </>
          ) : (
            "Confirm Invitation"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {!canConfirm 
            ? "Fill in required fields to confirm" 
            : isConfirmed 
              ? "You can now send the invitation" 
              : "Confirm to enable Send Invitation"}
        </p>
      </CardContent>
    </Card>
  );
}
