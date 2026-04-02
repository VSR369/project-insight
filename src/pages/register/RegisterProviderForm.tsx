/**
 * RegisterProviderForm — Experienced + Student provider registration forms.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, UserPlus, GraduationCap, Briefcase } from 'lucide-react';
import { useCountries } from '@/hooks/queries/useMasterData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RegisterFormData, StudentRegisterFormData } from '@/lib/validations/auth';
import type { ProviderSubTab } from './registerConstants';

interface Props {
  experiencedForm: ReturnType<typeof useForm<RegisterFormData>>;
  studentForm: ReturnType<typeof useForm<StudentRegisterFormData>>;
  providerSubTab: ProviderSubTab;
  setProviderSubTab: (v: ProviderSubTab) => void;
  onProviderSubmit: (data: RegisterFormData | StudentRegisterFormData) => void;
  isLoading: boolean;
}

export function RegisterProviderForm({
  experiencedForm, studentForm, providerSubTab, setProviderSubTab,
  onProviderSubmit, isLoading,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { data: countries } = useCountries();

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

  const renderCommonFields = (form: ReturnType<typeof useForm<RegisterFormData>>) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="firstName" render={({ field }) => (
          <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="lastName" render={({ field }) => (
          <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>
      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="you@example.com" autoComplete="email" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      {renderPasswordFields(form)}
      <FormField control={form.control} name="address" render={({ field }) => (
        <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Textarea placeholder="Your address" rows={2} disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="pinCode" render={({ field }) => (
          <FormItem><FormLabel>Pin Code (Optional)</FormLabel><FormControl><Input placeholder="123456" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="countryId" render={({ field }) => (
          <FormItem>
            <FormLabel>Country (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
              <SelectContent>{countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </>
  );

  return (
    <div className="px-6">
      <Tabs value={providerSubTab} onValueChange={(v) => setProviderSubTab(v as ProviderSubTab)}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="experienced" className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Experienced</TabsTrigger>
          <TabsTrigger value="student" className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Student</TabsTrigger>
        </TabsList>

        <TabsContent value="experienced" className="mt-0">
          <Form {...experiencedForm}>
            <form onSubmit={experiencedForm.handleSubmit(onProviderSubmit)}>
              <CardContent className="space-y-4 px-0">{renderCommonFields(experiencedForm)}</CardContent>
              <CardFooter className="flex flex-col gap-4 px-0">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}Create Account
                </Button>
              </CardFooter>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="student" className="mt-0">
          <Form {...studentForm}>
            <form onSubmit={studentForm.handleSubmit(onProviderSubmit)}>
              <CardContent className="space-y-4 px-0">
                {renderCommonFields(studentForm as unknown as ReturnType<typeof useForm<RegisterFormData>>)}
                <FormField control={studentForm.control} name="institution" render={({ field }) => (
                  <FormItem><FormLabel>Institution Name</FormLabel><FormControl><Input placeholder="University / College name" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={studentForm.control} name="graduationYear" render={({ field }) => (
                    <FormItem><FormLabel>Graduation Year</FormLabel><FormControl><Input type="number" placeholder="2025" disabled={isLoading} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 px-0">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}Create Account
                </Button>
              </CardFooter>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
