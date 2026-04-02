/**
 * RegisterAdminForm — Platform admin registration form.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AdminRegisterFormData, RegisterFormData } from '@/lib/validations/auth';

interface Props {
  adminForm: ReturnType<typeof useForm<AdminRegisterFormData>>;
  onAdminSubmit: (data: AdminRegisterFormData) => void;
  isLoading: boolean;
}

export function RegisterAdminForm({ adminForm, onAdminSubmit, isLoading }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <Form {...adminForm}>
      <form onSubmit={adminForm.handleSubmit(onAdminSubmit)}>
        <CardContent className="space-y-4 pt-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>Admin registration is restricted. You must have a valid access code provided by an existing administrator.</AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={adminForm.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={adminForm.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={adminForm.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="admin@company.com" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          {renderPasswordFields(adminForm as unknown as ReturnType<typeof useForm<RegisterFormData>>)}

          <FormField control={adminForm.control} name="accessCode" render={({ field }) => (
            <FormItem>
              <FormLabel>Access Code</FormLabel>
              <FormControl><Input type="password" placeholder="Enter your access code" disabled={isLoading} {...field} /></FormControl>
              <FormDescription>Contact your organization's administrator for an access code</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}Register as Admin
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
