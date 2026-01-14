import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useExpertiseLevels } from '@/hooks/queries/useMasterData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExpertiseLevel() {
  const navigate = useNavigate();
  const { data: levels, isLoading } = useExpertiseLevels();
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  const handleContinue = () => {
    navigate('/profile/build/proficiency');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 3 of 5</span>
            <span>•</span>
            <span>Expertise Level</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            What's Your Expertise Level?
          </h1>
          <p className="text-muted-foreground mt-2">
            Select the level that best represents your professional experience.
          </p>
        </div>

        {/* Level Selection */}
        <RadioGroup 
          value={selectedLevel} 
          onValueChange={setSelectedLevel} 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {levels?.map((level) => {
            const isSelected = selectedLevel === level.id;
            const yearsText = level.max_years 
              ? `${level.min_years}-${level.max_years} years`
              : `${level.min_years}+ years`;

            return (
              <Label
                key={level.id}
                htmlFor={level.id}
                className="cursor-pointer h-full"
              >
                <Card
                  className={cn(
                    "h-full transition-all hover:border-primary/50 relative overflow-hidden",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  {/* Level Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant={isSelected ? "default" : "secondary"}>
                      Level {level.level_number}
                    </Badge>
                  </div>

                  <CardContent className="p-4 pt-12 flex flex-col h-full">
                    <RadioGroupItem 
                      value={level.id} 
                      id={level.id} 
                      className="sr-only" 
                    />

                    {/* Stars */}
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: level.level_number }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "fill-primary text-primary" : "fill-muted-foreground/30 text-muted-foreground/30"
                          )} 
                        />
                      ))}
                    </div>

                    {/* Title & Years */}
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {level.name}
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </h3>
                    <span className="text-sm text-primary font-medium mt-1">
                      {yearsText}
                    </span>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mt-3 flex-1">
                      {level.description}
                    </p>
                  </CardContent>
                </Card>
              </Label>
            );
          })}
        </RadioGroup>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedLevel}
            className="gap-2 sm:ml-auto"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
