/**
 * Verified Skills Card Component
 * Displays skill name, level, progress bar
 * Uses useProviderSkills hook
 */

import { CheckCircle2, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviderSkills } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface VerifiedSkillsCardProps {
  providerId: string;
  className?: string;
}

// XP required for each skill level
const SKILL_XP_REQUIREMENTS = [100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];

function getSkillProgress(currentXp: number, currentLevel: number) {
  const prevRequired = currentLevel > 1 ? SKILL_XP_REQUIREMENTS[currentLevel - 2] || 0 : 0;
  const nextRequired = SKILL_XP_REQUIREMENTS[currentLevel - 1] || SKILL_XP_REQUIREMENTS[SKILL_XP_REQUIREMENTS.length - 1];
  
  const xpInLevel = currentXp - prevRequired;
  const xpForLevel = nextRequired - prevRequired;
  const progress = Math.min(100, Math.max(0, (xpInLevel / xpForLevel) * 100));
  
  return {
    current: currentXp,
    required: nextRequired,
    progress,
    xpToNext: Math.max(0, nextRequired - currentXp),
  };
}

export function VerifiedSkillsCard({ providerId, className }: VerifiedSkillsCardProps) {
  const { data: skills, isLoading } = useProviderSkills(providerId);

  // Only show verified skills
  const verifiedSkills = skills?.filter(s => s.is_verified) || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (verifiedSkills.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Verified Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Star className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Complete assessments or create content to earn verified skills.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
          Verified Skills
          <Badge variant="secondary" className="ml-auto text-xs">
            {verifiedSkills.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {verifiedSkills.map((skill) => {
          const progress = getSkillProgress(Number(skill.current_xp), skill.current_level);
          const industry = (skill as any).industry_segment?.name || 'Industry';
          const level = (skill as any).expertise_level?.name || `Level ${skill.current_level}`;

          return (
            <div key={skill.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-sm">{industry}</p>
                    <p className="text-xs text-muted-foreground">{level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      skill.current_level >= 5 && "border-yellow-500 text-yellow-600"
                    )}
                  >
                    <Star className="h-3 w-3 mr-1" aria-hidden="true" />
                    Skill Lvl {skill.current_level}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-1">
                <Progress 
                  value={progress.progress} 
                  className="h-2"
                  aria-label={`${progress.progress.toFixed(0)}% to next skill level`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress.current.toLocaleString()} XP</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    {progress.xpToNext.toLocaleString()} to next
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
