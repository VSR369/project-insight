import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ReadinessCheck {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
}

interface PublicationChecklistProps {
  checks: ReadinessCheck[];
  allPassed: boolean;
  failCount: number;
  isQuick: boolean;
}

export function PublicationChecklist({ checks, allPassed, failCount, isQuick }: PublicationChecklistProps) {
  return (
    <>
      <div className={cn(
        'rounded-lg border px-5 py-4 flex items-center gap-3',
        allPassed ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20',
      )}>
        {allPassed ? <ShieldCheck className="h-5 w-5 shrink-0 text-primary" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />}
        <div>
          <p className={cn('text-sm font-bold', allPassed ? 'text-foreground' : 'text-destructive')}>
            {allPassed ? 'READY TO PUBLISH — All checks passed' : `${failCount} item${failCount !== 1 ? 's' : ''} need${failCount !== 1 ? '' : 's'} attention before publishing`}
          </p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {allPassed ? `This challenge meets all ${isQuick ? 'GATE-11-L' : 'GATE-11'} requirements.` : `Resolve the items below to pass ${isQuick ? 'GATE-11-L' : 'GATE-11'} validation.`}
          </p>
        </div>
      </div>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Pre-Publication Validation
            <Badge variant="outline" className="ml-auto text-xs font-normal">{isQuick ? 'GATE-11-L' : 'GATE-11'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          {checks.map((check, index) => (
            <div key={check.id}>
              {index > 0 && <Separator className="my-0" />}
              <div className="flex items-start gap-3 py-3.5">
                {check.passed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[13px] font-semibold', check.passed ? 'text-foreground' : 'text-destructive')}>{check.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
