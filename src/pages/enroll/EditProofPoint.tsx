import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Loader2, GraduationCap, Building2, AlertTriangle } from 'lucide-react';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useProofPoint, useUpdateProofPoint } from '@/hooks/queries/useProofPoints';
import { useProviderSelectedTaxonomy } from '@/hooks/queries/useProviderSelectedTaxonomy';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { 
  useEnrollmentCanModifyField, 
  useEnrollmentIsTerminal 
} from '@/hooks/queries/useEnrollmentExpertise';
import { useProofPointCategoryPreference } from '@/hooks/useProofPointCategoryPreference';
import { LockedFieldBanner } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { 
  CategorySelector, 
  ProofPointTypeSelect, 
  SpecialityTreeSelector,
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

function EditProofPointContent() {
  const navigate = useNavigate();
  const { id: proofPointId } = useParams<{ id: string }>();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: proofPointData, isLoading: proofPointLoading } = useProofPoint(proofPointId);
  const { data: expertiseLevels } = useExpertiseLevels();
  const { data: industrySegments } = useIndustrySegments();
  
  // Get active enrollment from context
  const { 
    activeEnrollment, 
    activeEnrollmentId,
    activeIndustryId,
    isLoading: enrollmentLoading 
  } = useEnrollmentContext();
  
  // Fetch taxonomy filtered to provider's SELECTED proficiency areas only
  const { data: taxonomy = [], isLoading: taxonomyLoading } = useProviderSelectedTaxonomy(
    activeEnrollmentId || undefined
  );
  
  const updateProofPoint = useUpdateProofPoint();

  // Category persistence
  const { saveCategory } = useProofPointCategoryPreference();

  // Lifecycle validation scoped to enrollment
  const contentCheck = useEnrollmentCanModifyField(activeEnrollmentId ?? undefined, 'content');
  const terminalState = useEnrollmentIsTerminal(activeEnrollmentId ?? undefined);
  const isTerminal = terminalState.isTerminal;
  const isContentLocked = !contentCheck.isLoading && (!contentCheck.allowed || isTerminal);

  const [selectedSpecialityId, setSelectedSpecialityId] = useState<string | null>(null);
  const [showCategoryWarning, setShowCategoryWarning] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Memoized handler to prevent child re-renders
  const handleSpecialityChange = useCallback((id: string | null) => {
    setSelectedSpecialityId(id);
  }, []);

  // Get expertise level and industry names for display
  const expertiseLevel = expertiseLevels?.find(l => l.id === activeEnrollment?.expertise_level_id);
  const industryName = industrySegments?.find(s => s.id === activeIndustryId)?.name;

  const form = useForm<FormValues>({
    resolver: zodResolver(proofPointSchema),
    defaultValues: {
      category: 'general',
      type: '',
      title: '',
      description: '',
    },
  });

  // Initialize form with existing proof point data
  useEffect(() => {
    if (proofPointData && !formInitialized) {
      form.reset({
        category: proofPointData.category as 'general' | 'specialty_specific',
        type: proofPointData.type,
        title: proofPointData.title,
        description: proofPointData.description,
      });
      
      // Set the selected speciality from existing tags
      if (proofPointData.specialityTags && proofPointData.specialityTags.length > 0) {
        const firstTag = proofPointData.specialityTags[0];
        if (firstTag && typeof firstTag === 'object' && 'speciality_id' in firstTag) {
          setSelectedSpecialityId(firstTag.speciality_id as string);
        }
      }
      
      setFormInitialized(true);
    }
  }, [proofPointData, form, formInitialized]);

  // Redirect if content is locked (only after loading completes)
  useEffect(() => {
    if (!providerLoading && !enrollmentLoading && !contentCheck.isLoading && isContentLocked) {
      toast.error('Content modification is locked at this lifecycle stage.');
      navigate('/enroll/proof-points');
    }
  }, [providerLoading, enrollmentLoading, contentCheck.isLoading, isContentLocked, navigate]);

  const category = form.watch('category');
  const isSubmitting = updateProofPoint.isPending;

  const handleBack = () => {
    navigate('/enroll/proof-points');
  };

  const onSubmit = async (values: FormValues) => {
    if (!provider?.id || !proofPointId) return;

    if (isContentLocked) {
      toast.error('Content modification is locked.');
      return;
    }

    // Warn if specialty_specific but no speciality selected
    if (values.category === 'specialty_specific' && !selectedSpecialityId) {
      setShowCategoryWarning(true);
      return;
    }

    await saveProofPoint(values);
  };

  const saveProofPoint = async (values: FormValues, forceGeneral = false) => {
    if (!provider?.id || !proofPointId) return;

    try {
      // Determine final category
      const finalCategory = forceGeneral ? 'general' : values.category;

      // Update proof point (enrollment-scoped)
      await updateProofPoint.mutateAsync({
        id: proofPointId,
        providerId: provider.id,
        enrollmentId: activeEnrollmentId || undefined,
        category: finalCategory as ProofPointCategory,
        type: values.type as ProofPointType,
        title: values.title,
        description: values.description,
        specialityIds: finalCategory === 'specialty_specific' && selectedSpecialityId ? [selectedSpecialityId] : [],
      });

      // Update persisted category preference
      saveCategory(finalCategory as 'general' | 'specialty_specific');

      navigate('/enroll/proof-points');
    } catch {
      // Error handled by mutation
    }
  };

  const handleSaveAsGeneral = () => {
    setShowCategoryWarning(false);
    const values = form.getValues();
    saveProofPoint(values, true);
  };

  const handleCancelWarning = () => {
    setShowCategoryWarning(false);
  };

  if (providerLoading || enrollmentLoading || proofPointLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show 404 if proof point not found
  if (!proofPointData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Proof Point Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The proof point you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={handleBack}>Back to Proof Points</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show lock banner if trying to access when locked (before redirect)
  if (isContentLocked) {
    return (
      <div className="min-h-screen bg-background p-6">
        <LockedFieldBanner 
          lockLevel={isTerminal ? "everything" : "content"}
          reason="Proof point editing is not allowed at this lifecycle stage."
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
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Edit Proof Point</h1>
            <p className="text-muted-foreground mt-1">
              Update your proof point details and speciality mapping
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Category Selection */}
              <Card>
                <CardContent className="p-6">
                  <CategorySelector
                    value={category as 'general' | 'specialty_specific'}
                    onChange={(v) => {
                      form.setValue('category', v);
                      saveCategory(v);
                    }}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              {/* Speciality Mapping (shown first when Category = Speciality) */}
              {category === 'specialty_specific' && (
                <Card key="speciality-mapping-stable">
                  <CardHeader>
                    <CardTitle className="text-lg">Speciality Mapping</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SpecialityTreeSelector
                      taxonomy={taxonomy}
                      selectedSpecialityId={selectedSpecialityId}
                      onChange={handleSpecialityChange}
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
                  {/* Industry Context (read-only) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Industry</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {industryName || 'Not set'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-populated from your active enrollment</p>
                  </div>

                  {/* Expertise Level (read-only) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Expertise Level</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {expertiseLevel ? `Level ${expertiseLevel.level_number}: ${expertiseLevel.name}` : 'Not set'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-populated from your active enrollment</p>
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

              {/* Footer Actions */}
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Category Warning Dialog */}
      <AlertDialog open={showCategoryWarning} onOpenChange={setShowCategoryWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              No Speciality Selected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You selected the <strong>"Speciality"</strong> category but haven't mapped this proof point to a specific speciality.
              </p>
              <p>
                Would you like to save it as a <strong>"General"</strong> proof point instead, or go back to select a speciality?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWarning}>
              Go Back & Select Speciality
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsGeneral}>
              Save as General
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function EditProofPoint() {
  return (
    <FeatureErrorBoundary featureName="Edit Proof Point">
      <EditProofPointContent />
    </FeatureErrorBoundary>
  );
}
