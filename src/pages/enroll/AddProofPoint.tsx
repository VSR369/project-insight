import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Save, Loader2, GraduationCap } from 'lucide-react';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useCreateProofPoint, useUploadProofPointFile } from '@/hooks/queries/useProofPoints';
import { useProficiencyTaxonomy } from '@/hooks/queries/useProficiencyTaxonomy';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { useCanModifyField, useIsTerminalState } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { 
  CategorySelector, 
  ProofPointTypeSelect, 
  SpecialityTreeSelector,
  SupportingLinksForm,
  SupportingFilesUploader,
  type UploadedFile 
} from '@/components/proof-points';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ProofPointType = Database['public']['Enums']['proof_point_type'];
type ProofPointCategory = Database['public']['Enums']['proof_point_category'];

const proofPointSchema = z.object({
  category: z.enum(['general', 'specialty_specific']),
  type: z.string().min(1, 'Please select a type'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000, 'Description must be 1000 characters or less'),
});

type FormValues = z.infer<typeof proofPointSchema>;

function AddProofPointContent() {
  const navigate = useNavigate();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: expertiseLevels } = useExpertiseLevels();
  const { data: taxonomy = [], isLoading: taxonomyLoading } = useProficiencyTaxonomy(
    provider?.industry_segment_id || undefined,
    provider?.expertise_level_id || undefined
  );
  
  const createProofPoint = useCreateProofPoint();
  const uploadFile = useUploadProofPointFile();

  // Lifecycle validation
  const contentCheck = useCanModifyField('content');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const isContentLocked = !contentCheck.allowed || isTerminal;

  const [selectedSpecialityIds, setSelectedSpecialityIds] = useState<string[]>([]);
  const [links, setLinks] = useState<Array<{ url: string; title: string; description: string }>>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const expertiseLevel = expertiseLevels?.find(l => l.id === provider?.expertise_level_id);

  const form = useForm<FormValues>({
    resolver: zodResolver(proofPointSchema),
    defaultValues: {
      category: 'general',
      type: '',
      title: '',
      description: '',
    },
  });

  // Redirect if content is locked
  useEffect(() => {
    if (!providerLoading && isContentLocked) {
      toast.error('Content modification is locked at this lifecycle stage.');
      navigate('/enroll/proof-points');
    }
  }, [providerLoading, isContentLocked, navigate]);

  const category = form.watch('category');
  const isSubmitting = createProofPoint.isPending || uploadFile.isPending;

  const handleBack = () => {
    navigate('/enroll/proof-points');
  };

  const onSubmit = async (values: FormValues) => {
    if (!provider?.id) return;

    if (isContentLocked) {
      toast.error('Content modification is locked.');
      return;
    }

    try {
      // Filter valid links
      const validLinks = links.filter(l => l.url.trim());

      // Create proof point with industry context
      const proofPoint = await createProofPoint.mutateAsync({
        providerId: provider.id,
        industrySegmentId: provider.industry_segment_id || undefined, // NEW: Track industry
        category: values.category as ProofPointCategory,
        type: values.type as ProofPointType,
        title: values.title,
        description: values.description,
        specialityIds: values.category === 'specialty_specific' ? selectedSpecialityIds : [],
        links: validLinks,
      });

      // Upload files
      const pendingFiles = files.filter(f => f.status === 'pending' && f.file);
      for (const fileData of pendingFiles) {
        if (fileData.file) {
          await uploadFile.mutateAsync({
            proofPointId: proofPoint.id,
            file: fileData.file,
            providerId: provider.id,
            userId: provider.user_id,
          });
        }
      }

      navigate('/enroll/proof-points');
    } catch {
      // Error handled by mutation
    }
  };

  if (providerLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show lock banner if trying to access when locked (before redirect)
  if (isContentLocked) {
    return (
      <div className="min-h-screen bg-background p-6">
        <LockedFieldBanner 
          lockLevel={isTerminal ? "everything" : "content"}
          reason="Proof point creation is not allowed at this lifecycle stage."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Profile Strengthening
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Proof Point
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Add New Proof Point</h1>
            <p className="text-muted-foreground mt-1">
              Showcase your expertise with real-world evidence
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Category Selection */}
              <Card>
                <CardContent className="p-6">
                  <CategorySelector
                    value={category as 'general' | 'specialty_specific'}
                    onChange={(v) => form.setValue('category', v)}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              {/* Speciality Mapping (shown first when Category = Speciality) */}
              {category === 'specialty_specific' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Speciality Mapping</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SpecialityTreeSelector
                      taxonomy={taxonomy}
                      selectedSpecialityIds={selectedSpecialityIds}
                      onChange={setSelectedSpecialityIds}
                      disabled={isSubmitting}
                      loading={taxonomyLoading}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Expertise Level (read-only) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Expertise Level</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {expertiseLevel ? `Level ${expertiseLevel.level_number}: ${expertiseLevel.name}` : 'Not set'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-populated from your profile</p>
                  </div>

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., E-commerce Platform Development" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Type */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <ProofPointTypeSelect
                          value={field.value as ProofPointType | ''}
                          onChange={field.onChange}
                          error={form.formState.errors.type?.message}
                          disabled={isSubmitting}
                        />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your proof point, including key results and impact..."
                            rows={6}
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <FormMessage />
                          <span>{field.value.length}/1000</span>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Supporting Links */}
              <Card>
                <CardContent className="p-6">
                  <SupportingLinksForm
                    links={links}
                    onChange={setLinks}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              {/* Supporting Files */}
              <Card>
                <CardContent className="p-6">
                  <SupportingFilesUploader
                    files={files}
                    onChange={setFiles}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              {/* Footer Actions */}
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Proof Point
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function AddProofPoint() {
  return (
    <FeatureErrorBoundary featureName="Add Proof Point">
      <AddProofPointContent />
    </FeatureErrorBoundary>
  );
}
