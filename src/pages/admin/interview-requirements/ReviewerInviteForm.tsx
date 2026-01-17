import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  RefreshCw, 
  Building2, 
  GraduationCap,
  Clock,
  Globe,
  Languages,
  Send,
  Save,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import {
  reviewerInviteSchema,
  ReviewerInviteFormData,
  DEFAULT_INVITATION_MESSAGE,
  TIMEZONE_OPTIONS,
  EXPIRY_OPTIONS,
  EXPERIENCE_OPTIONS,
} from "@/lib/validations/reviewer";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useCreatePanelReviewer, useSendReviewerInvitation } from "@/hooks/queries/usePanelReviewers";
import { InvitationPreviewPanel } from "./InvitationPreviewPanel";

interface ReviewerInviteFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Generate secure password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

export function ReviewerInviteForm({ onSuccess, onCancel }: ReviewerInviteFormProps) {
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [newLanguage, setNewLanguage] = useState("");

  const { data: levels, isLoading: levelsLoading } = useExpertiseLevels(false);
  const { data: industries, isLoading: industriesLoading } = useIndustrySegments(false);
  
  const createReviewer = useCreatePanelReviewer();
  const sendInvitation = useSendReviewerInvitation();

  const form = useForm<ReviewerInviteFormData>({
    resolver: zodResolver(reviewerInviteSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      industry_segment_ids: [],
      expertise_level_ids: [],
      years_experience: undefined,
      timezone: "Asia/Calcutta",
      languages: [],
      max_interviews_per_day: 4,
      is_active: true,
      notes: "",
      channel: "email",
      message: DEFAULT_INVITATION_MESSAGE,
      expiry_days: 14,
    },
  });

  const watchedValues = form.watch();

  // Handle password generation
  const handleGeneratePassword = () => {
    const password = generatePassword();
    setGeneratedPassword(password);
    form.setValue("password", password);
  };

  // Add language
  const handleAddLanguage = () => {
    if (newLanguage.trim()) {
      const current = form.getValues("languages") || [];
      if (!current.includes(newLanguage.trim())) {
        form.setValue("languages", [...current, newLanguage.trim()]);
      }
      setNewLanguage("");
    }
  };

  // Remove language
  const handleRemoveLanguage = (lang: string) => {
    const current = form.getValues("languages") || [];
    form.setValue("languages", current.filter(l => l !== lang));
  };

  // Toggle expertise level
  const toggleLevel = (levelId: string, checked: boolean) => {
    const current = form.getValues("expertise_level_ids") || [];
    if (checked) {
      form.setValue("expertise_level_ids", [...current, levelId]);
    } else {
      form.setValue("expertise_level_ids", current.filter(id => id !== levelId));
    }
  };

  // Select all levels
  const selectAllLevels = () => {
    if (levels) {
      form.setValue("expertise_level_ids", levels.map(l => l.id));
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    const data = form.getValues();
    
    // Validate required fields
    if (!data.name || !data.email || !data.industry_segment_ids?.length || !data.expertise_level_ids?.length) {
      toast.error("Please fill in required fields: Name, Email, Industry, and Expertise Levels");
      return;
    }

    const result = await createReviewer.mutateAsync({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      password: data.password || generatedPassword || undefined,
      industry_segment_ids: data.industry_segment_ids,
      expertise_level_ids: data.expertise_level_ids,
      years_experience: data.years_experience,
      timezone: data.timezone,
      languages: data.languages,
      max_interviews_per_day: data.max_interviews_per_day,
      is_active: data.is_active,
      notes: data.notes,
    });

    if (result.success) {
      form.reset();
      setGeneratedPassword("");
      onSuccess?.();
    }
  };

  // Send invitation
  const handleSendInvitation = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();

    // First create the reviewer
    const result = await createReviewer.mutateAsync({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      password: data.password || generatedPassword || undefined,
      industry_segment_ids: data.industry_segment_ids,
      expertise_level_ids: data.expertise_level_ids,
      years_experience: data.years_experience,
      timezone: data.timezone,
      languages: data.languages,
      max_interviews_per_day: data.max_interviews_per_day,
      is_active: data.is_active,
      notes: data.notes,
    });

    if (!result.success || !result.data) {
      return;
    }

    // Then send the invitation
    await sendInvitation.mutateAsync({
      reviewer_id: result.data.reviewer_id,
      channel: data.channel,
      message: data.message,
      expiry_days: data.expiry_days,
      password: result.data.password,
    });

    form.reset();
    setGeneratedPassword("");
    onSuccess?.();
  };

  const isLoading = createReviewer.isPending || sendInvitation.isPending;
  const sortedLevels = useMemo(() => 
    levels?.slice().sort((a, b) => a.level_number - b.level_number) || [],
    [levels]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form Section - 3 columns */}
      <div className="lg:col-span-3 space-y-6">
        <Form {...form}>
          <form className="space-y-6">
            {/* Identity Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="email@example.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="+91 9876543210" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Role Type</FormLabel>
                  <Input value="Review Panel Member" disabled className="bg-muted" />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              className="pl-9 font-mono" 
                              placeholder="Auto-generated if empty"
                              {...field} 
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleGeneratePassword}
                            title="Generate password"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>Leave empty to auto-generate</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Status</FormLabel>
                        <FormDescription className="text-xs">
                          {field.value ? "Active" : "Inactive"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Review Coverage Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Review Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="industry_segment_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Segment *</FormLabel>
                      <Select
                        value={field.value?.[0] || ""}
                        onValueChange={(value) => field.onChange([value])}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry segment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries?.map((industry) => (
                            <SelectItem key={industry.id} value={industry.id}>
                              {industry.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expertise_level_ids"
                  render={() => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Expertise Levels to Review *</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={selectAllLevels}
                        >
                          Select All
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {sortedLevels.map((level) => {
                          const isChecked = watchedValues.expertise_level_ids?.includes(level.id);
                          return (
                            <label
                              key={level.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                isChecked 
                                  ? "bg-primary/10 border-primary" 
                                  : "hover:bg-muted"
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => toggleLevel(level.id, !!checked)}
                              />
                              <span className="text-sm">L{level.level_number}</span>
                              <span className="text-xs text-muted-foreground">{level.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="years_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Relevant Experience</FormLabel>
                      <Select
                        value={field.value?.toString() || ""}
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience range (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPERIENCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Preferences Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Preferences (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="languages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Languages</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add language"
                          value={newLanguage}
                          onChange={(e) => setNewLanguage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLanguage())}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={handleAddLanguage}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((lang) => (
                            <Badge key={lang} variant="secondary" className="gap-1">
                              {lang}
                              <button
                                type="button"
                                onClick={() => handleRemoveLanguage(lang)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Invitation Settings Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Invitation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Channel</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="email" id="email" />
                            <label htmlFor="email" className="text-sm cursor-pointer">Email</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sms" id="sms" />
                            <label htmlFor="sms" className="text-sm cursor-pointer">SMS</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="both" id="both" />
                            <label htmlFor="both" className="text-sm cursor-pointer">Both</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter invitation message..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiry_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Expiry</FormLabel>
                      <Select
                        value={field.value?.toString() || "14"}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPIRY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button
                  type="button"
                  onClick={handleSendInvitation}
                  disabled={isLoading}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isLoading ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Preview Section - 2 columns */}
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          <InvitationPreviewPanel
            formData={watchedValues}
            invitationSettings={{
              channel: watchedValues.channel,
              message: watchedValues.message,
              expiry_days: watchedValues.expiry_days,
            }}
            generatedPassword={generatedPassword || watchedValues.password}
          />
        </div>
      </div>
    </div>
  );
}
