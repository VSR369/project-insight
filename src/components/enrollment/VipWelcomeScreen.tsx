/**
 * VipWelcomeScreen — Crown welcome screen for VIP providers
 * clicking their invitation link.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VipWelcomeScreenProps {
  firstName: string;
  lastName: string;
  email: string;
  onContinue: () => void;
  className?: string;
}

const VIP_BENEFITS = [
  'Instant Eminent (3-star) certification',
  'Priority access to premium challenges',
  'Featured expert profile across the platform',
  'Skip enrollment wizard — direct dashboard access',
];

export function VipWelcomeScreen({
  firstName,
  lastName,
  email,
  onContinue,
  className,
}: VipWelcomeScreenProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[70vh]', className)}>
      <Card className="w-full max-w-lg border-amber-300 shadow-lg shadow-amber-100/50">
        <CardContent className="pt-8 pb-6 px-8 text-center space-y-6">
          {/* Crown icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center border-2 border-amber-200">
            <Crown className="h-10 w-10 text-amber-500" />
          </div>

          {/* Welcome text */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {firstName} {lastName}!
            </h1>
            <p className="text-muted-foreground">
              You've been invited as a <span className="font-semibold text-amber-700">VIP Expert</span> on CogniBlend.
            </p>
          </div>

          {/* Benefits */}
          <ul className="space-y-2 text-left">
            {VIP_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Email confirmation */}
          <p className="text-xs text-muted-foreground">
            Invitation sent to <span className="font-medium">{email}</span>
          </p>

          {/* CTA */}
          <Button size="lg" className="w-full" onClick={onContinue}>
            Accept &amp; Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
