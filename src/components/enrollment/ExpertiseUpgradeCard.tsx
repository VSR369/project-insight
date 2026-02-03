/**
 * Expertise Upgrade Card
 * 
 * Dashboard card for certified providers to initiate expertise upgrade.
 */

import { ArrowUpCircle, Star, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/StarRating';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface ExpertiseUpgradeCardProps {
  enrollmentId: string;
  currentLevel: string | null;
  stars: number | null;
  certifiedAt: string | null;
  upgradeCount?: number;
  onUpgrade: () => void;
}

export function ExpertiseUpgradeCard({
  currentLevel,
  stars,
  certifiedAt,
  upgradeCount = 0,
  onUpgrade,
}: ExpertiseUpgradeCardProps) {
  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle className="text-lg">Upgrade Expertise Level</CardTitle>
          </div>
          {upgradeCount > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {upgradeCount} previous upgrade{upgradeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <CardDescription>
          You can upgrade to a higher expertise level and go through re-certification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current certification info */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-3 bg-background/60 rounded-lg">
          <div className="flex-1 space-y-1">
            <p className="text-sm text-muted-foreground">Current Level</p>
            <p className="font-medium">{currentLevel || 'Not set'}</p>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm text-muted-foreground">Star Rating</p>
            <StarRating rating={stars} size="md" showLabel />
          </div>
          {certifiedAt && (
            <div className="flex-1 space-y-1">
              <p className="text-sm text-muted-foreground">Certified On</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{format(new Date(certifiedAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade info and CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Your proof points will be retained</p>
            <p>• Assessment and interview are mandatory</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={onUpgrade}
                className="bg-green-600 hover:bg-green-700 text-white w-full lg:w-auto"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Upgrade Expertise
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>Start the upgrade process to change your expertise level. You'll need to re-take the assessment and interview.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
