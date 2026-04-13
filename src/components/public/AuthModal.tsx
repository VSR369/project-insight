/**
 * AuthModal — Sign-in/Register tabs in a dialog per Spec 6.1
 * Lightweight modal that links to auth pages (not a full embedded form)
 */

import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const navigate = useNavigate();

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to CogniBlend</DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new provider profile.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signin" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account? Sign in to access your dashboard,
              challenges, and certifications.
            </p>
            <Button className="w-full" onClick={() => goTo('/login')}>
              <LogIn className="mr-2 h-4 w-4" />
              Go to Sign In
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              New here? Create a provider profile, declare your expertise,
              and start competing in challenges.
            </p>
            <Button className="w-full" onClick={() => goTo('/register')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
