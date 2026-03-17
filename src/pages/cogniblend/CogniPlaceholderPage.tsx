/**
 * CogniPlaceholderPage — Reusable "Coming Soon" placeholder for unimplemented CogniBlend routes.
 * Renders inside CogniShell (no extra layout wrapper needed).
 */

import { Construction } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CogniPlaceholderPageProps {
  title: string;
  description?: string;
}

export default function CogniPlaceholderPage({ title, description }: CogniPlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description || 'This feature is under development and will be available soon.'}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
