/**
 * Timezone Info Panel
 * 
 * Displays dual timezone information for reviewer and provider
 * with UTC offset display.
 */

import { Globe, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserTimezone } from "@/components/interview/TimeZoneSelector";

interface TimezoneInfoPanelProps {
  reviewerTimezone: string;
  providerTimezone: string | null;
  providerName: string;
}

// Get timezone offset string (e.g., "UTC+5:30")
function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart?.value || timezone;
  } catch {
    return timezone;
  }
}

// Get friendly timezone name
function getTimezoneFriendlyName(timezone: string): string {
  const tzMap: Record<string, string> = {
    'Asia/Kolkata': 'India Standard Time',
    'Asia/Seoul': 'Korea Standard Time',
    'Asia/Tokyo': 'Japan Standard Time',
    'Asia/Dubai': 'Gulf Standard Time',
    'Asia/Singapore': 'Singapore Time',
    'America/New_York': 'Eastern Time',
    'America/Los_Angeles': 'Pacific Time',
    'America/Chicago': 'Central Time',
    'Europe/London': 'Greenwich Mean Time',
    'Europe/Paris': 'Central European Time',
    'Australia/Sydney': 'Australian Eastern Time',
  };
  return tzMap[timezone] || timezone.replace(/_/g, ' ');
}

export function TimezoneInfoPanel({
  reviewerTimezone,
  providerTimezone,
  providerName,
}: TimezoneInfoPanelProps) {
  // Use browser-detected timezone as fallback for provider
  const effectiveProviderTimezone = providerTimezone || getUserTimezone();
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Timezone Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reviewer Timezone */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                Review Panel Member
              </p>
              <p className="text-sm text-muted-foreground">
                {getTimezoneOffset(reviewerTimezone)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getTimezoneFriendlyName(reviewerTimezone)}
              </p>
            </div>
          </div>

          {/* Provider Timezone */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-secondary/50">
              <Globe className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                Solution Provider
              </p>
              <p className="text-sm text-muted-foreground">
                {getTimezoneOffset(effectiveProviderTimezone)}
              </p>
              <p className="text-xs text-muted-foreground">
                {providerName}'s Local Time
                {!providerTimezone && (
                  <span className="text-muted-foreground/60"> (detected)</span>
                )}
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          Note: All available slots are displayed in both timezones automatically.
        </p>
      </CardContent>
    </Card>
  );
}
