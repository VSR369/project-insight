/**
 * RegisterReviewerForm — Reviewer application registration form.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, UserPlus, AlertCircle, Shield } from 'lucide-react';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ReviewerRegisterFormData, RegisterFormData } from '@/lib/validations/auth';
import { TIMEZONE_OPTIONS } from './registerConstants';

interface Props {
  reviewerForm: ReturnType<typeof useForm<ReviewerRegisterFormData>>;
  onReviewerSubmit: (data: ReviewerRegisterFormData) => void;
  isLoading: boolean;
}

export function RegisterReviewerForm({ reviewerForm, onReviewerSubmit, isLoading }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { data: industrySegments } = useIndustrySegments();
  const { data: expertiseLevels } = useExpertiseLevels();

  const renderPasswordFields = (form: ReturnType<typeof useForm<RegisterFormData>>) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField control={form.control} name="password" render={({ field }) => (
        <FormItem>
          <FormLabel>Password</FormLabel>
          <div className="relative">
            <FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" disabled={isLoading} {...field} /></FormControl>
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="confirmPassword" render={({ field }) => (
        <FormItem>
          <FormLabel>Confirm Password</FormLabel>
          <div className="relative">
            <FormControl><Input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" disabled={isLoading} {...field} /></FormControl>
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );

  return (
    <Form {...reviewerForm}>
      <form onSubmit={reviewerForm.handleSubmit(onReviewerSubmit)}>
        <CardContent className="space-y-4 pt-6">
          <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Reviewer applications require admin approval. You'll be notified by email once approved.</AlertDescription></Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={reviewerForm.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={reviewerForm.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={reviewerForm.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="you@example.com" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={reviewerForm.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input placeholder="+91 9876543210" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          {renderPasswordFields(reviewerForm as unknown as ReturnType<typeof useForm<RegisterFormData>>)}

          <FormField control={reviewerForm.control} name="industrySegmentIds" render={({ field }) => (
            <FormItem>
              <FormLabel>Industry Segments</FormLabel>
              <FormDescription>Select the industries you have expertise in</FormDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                {industrySegments?.map((segment) => (
                  <label key={segment.id} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${field.value?.includes(segment.id) ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary/50'}`}>
                    <Checkbox checked={field.value?.includes(segment.id)} onCheckedChange={(checked) => { const current = field.value || []; field.onChange(checked ? [...current, segment.id] : current.filter((id) => id !== segment.id)); }} />
                    <span className="text-sm">{segment.name}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={reviewerForm.control} name="expertiseLevelIds" render={({ field }) => (
            <FormItem>
              <FormLabel>Expertise Levels</FormLabel>
              <FormDescription>Select the levels you can evaluate</FormDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                {expertiseLevels?.map((level) => (
                  <label key={level.id} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${field.value?.includes(level.id) ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary/50'}`}>
                    <Checkbox checked={field.value?.includes(level.id)} onCheckedChange={(checked) => { const current = field.value || []; field.onChange(checked ? [...current, level.id] : current.filter((id) => id !== level.id)); }} />
                    <span className="text-sm">{level.name}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={reviewerForm.control} name="yearsExperience" render={({ field }) => (
              <FormItem><FormLabel>Years of Experience</FormLabel><FormControl><Input type="number" placeholder="10" disabled={isLoading} {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={reviewerForm.control} name="timezone" render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger></FormControl>
                  <SelectContent>{TIMEZONE_OPTIONS.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={reviewerForm.control} name="whyJoinStatement" render={({ field }) => (
            <FormItem>
              <FormLabel>Why do you want to be a reviewer?</FormLabel>
              <FormControl><Textarea placeholder="Share your motivation and what you can contribute as a panel reviewer..." rows={4} disabled={isLoading} {...field} /></FormControl>
              <FormDescription>{field.value?.length || 0}/500 characters (minimum 50)</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}Submit Application
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
