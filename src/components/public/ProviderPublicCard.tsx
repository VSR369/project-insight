/**
 * ProviderPublicCard — Public-facing provider card for marketplace/directory.
 * Spec 10.1: Shows provider name, expertise areas, cert tier, and industry.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MapPin } from 'lucide-react';
import { CertTierBadge } from '@/components/enrollment/CertTierBadge';
import { cn } from '@/lib/utils';

interface ProviderPublicCardProps {
  providerId: string;
  displayName: string;
  industryName: string | null;
  expertiseAreas?: string[];
  location?: string | null;
  certTier?: number;
  certLabel?: string;
  className?: string;
}

export function ProviderPublicCard({
  providerId,
  displayName,
  industryName,
  expertiseAreas = [],
  location,
  certTier,
  certLabel,
  className,
}: ProviderPublicCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)} role="article">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{displayName}</h3>
            {industryName && (
              <p className="text-xs text-muted-foreground">{industryName}</p>
            )}
          </div>
          {certTier !== undefined && certTier > 0 && (
            <CertTierBadge
              providerId={providerId}
              staticTier={certTier}
              staticLabel={certLabel}
            />
          )}
        </div>

        {location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {location}
          </div>
        )}

        {expertiseAreas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {expertiseAreas.slice(0, 3).map((area) => (
              <Badge key={area} variant="outline" className="text-[10px] px-1.5 py-0">
                {area}
              </Badge>
            ))}
            {expertiseAreas.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{expertiseAreas.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
