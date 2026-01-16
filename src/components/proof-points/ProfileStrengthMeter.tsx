import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Target } from 'lucide-react';

interface ProfileStrengthMeterProps {
  currentCount: number;
  recommendedCount?: number;
  minimumRequired?: number;
  showCard?: boolean;
  className?: string;
}

export function ProfileStrengthMeter({
  currentCount,
  recommendedCount = 5,
  minimumRequired = 2,
  showCard = true,
  className = '',
}: ProfileStrengthMeterProps) {
  const percentage = Math.min((currentCount / recommendedCount) * 100, 100);
  const minimumMet = currentCount >= minimumRequired;
  
  const getStrengthLabel = () => {
    if (currentCount === 0) return 'Getting Started';
    if (currentCount < minimumRequired) return 'Building Credibility';
    if (currentCount < recommendedCount) return 'Strong Profile';
    return 'Excellent Profile';
  };

  const getStrengthColor = () => {
    if (currentCount === 0) return 'text-muted-foreground';
    if (currentCount < minimumRequired) return 'text-amber-600';
    if (currentCount < recommendedCount) return 'text-blue-600';
    return 'text-green-600';
  };

  const content = (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Profile Strength</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${getStrengthColor()}`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {currentCount} of {recommendedCount} recommended
        </span>
        <Badge 
          variant={minimumMet ? "default" : "secondary"}
          className={`gap-1 ${minimumMet ? 'bg-green-600 hover:bg-green-700' : ''}`}
        >
          {minimumMet ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Minimum Met
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3" />
              Add {minimumRequired - currentCount} More
            </>
          )}
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {getStrengthLabel()} – Your credibility score is based on proof submissions and their quality.
      </p>
    </div>
  );

  if (!showCard) return content;

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
      <CardContent className="p-4 sm:p-6">
        {content}
      </CardContent>
    </Card>
  );
}
