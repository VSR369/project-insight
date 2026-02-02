/**
 * Invitation Accept Page
 * 
 * Validates invitation token from URL and redirects to registration
 * with invitation context.
 * 
 * Route: /invite/:token
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Crown, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useValidateInvitation, storeInvitationData, type InvitationData } from '@/hooks/queries/useValidateInvitation';

type PageState = 'loading' | 'success' | 'vip_welcome' | 'error';

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  const validateMutation = useValidateInvitation();

  useEffect(() => {
    if (!token) {
      setErrorMessage('No invitation token provided');
      setPageState('error');
      return;
    }

    validateMutation.mutate(token, {
      onSuccess: (data) => {
        setInvitationData(data);
        storeInvitationData(data);
        
        // VIP experts get a special welcome before redirect
        if (data.invitation_type === 'vip_expert') {
          setPageState('vip_welcome');
        } else {
          // Standard invitations redirect immediately
          setPageState('success');
          setTimeout(() => {
            navigate('/register?invitation=true');
          }, 1500);
        }
      },
      onError: (error) => {
        setErrorMessage(error.message || 'Failed to validate invitation');
        setPageState('error');
      },
    });
  }, [token]);

  const handleVipContinue = () => {
    navigate('/register?invitation=true');
  };

  const handleRetry = () => {
    if (token) {
      setPageState('loading');
      setErrorMessage('');
      validateMutation.mutate(token, {
        onSuccess: (data) => {
          setInvitationData(data);
          storeInvitationData(data);
          if (data.invitation_type === 'vip_expert') {
            setPageState('vip_welcome');
          } else {
            setPageState('success');
            setTimeout(() => navigate('/register?invitation=true'), 1500);
          }
        },
        onError: (error) => {
          setErrorMessage(error.message || 'Failed to validate invitation');
          setPageState('error');
        },
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        {/* Loading State */}
        {pageState === 'loading' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <CardTitle>Validating Invitation</CardTitle>
              <CardDescription>
                Please wait while we verify your invitation...
              </CardDescription>
            </CardHeader>
          </>
        )}

        {/* Success State (Standard Invitation) */}
        {pageState === 'success' && invitationData && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Invitation Verified!</CardTitle>
              <CardDescription>
                Welcome, {invitationData.first_name || 'there'}! Redirecting you to registration...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {invitationData.industry_name && (
                <Badge variant="secondary" className="mb-4">
                  {invitationData.industry_name}
                </Badge>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting...
              </div>
            </CardContent>
          </>
        )}

        {/* VIP Welcome State */}
        {pageState === 'vip_welcome' && invitationData && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Crown className="h-8 w-8 text-amber-500" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CardTitle>Welcome, VIP Expert!</CardTitle>
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                  VIP
                </Badge>
              </div>
              <CardDescription>
                {invitationData.first_name && invitationData.last_name
                  ? `Hello ${invitationData.first_name} ${invitationData.last_name}!`
                  : 'Hello!'} You've been invited as a VIP Expert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-500/5 border-amber-500/20">
                <Crown className="h-4 w-4 text-amber-500" />
                <AlertTitle>Fast-Track Certification</AlertTitle>
                <AlertDescription>
                  As a VIP Expert, you'll be automatically certified with our highest rating upon registration.
                  No assessments or interviews required!
                </AlertDescription>
              </Alert>

              {invitationData.industry_name && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Industry Segment</p>
                  <Badge variant="secondary" className="text-sm">
                    {invitationData.industry_name}
                  </Badge>
                </div>
              )}

              <Button onClick={handleVipContinue} className="w-full" size="lg">
                Continue to Registration
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </>
        )}

        {/* Error State */}
        {pageState === 'error' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Invitation Error</CardTitle>
              <CardDescription>
                We couldn't validate your invitation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {errorMessage || 'This invitation may be expired, already used, or invalid.'}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button onClick={handleRetry} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/login">Go to Login</Link>
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
