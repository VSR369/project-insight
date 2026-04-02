/**
 * DashboardEnrollmentCard — Single enrollment row in the Dashboard industry list.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StarRating } from '@/components/ui/StarRating';
import { getStatusDisplayName } from '@/services/lifecycleService';
import { getStatusBadgeVariant, getStatusIcon, getEnrollmentProgress, getNextAction, TERMINAL_STATUSES } from './DashboardHelpers';
import {
  Building2, GraduationCap, Users, FileText, Briefcase,
  ClipboardList, ChevronRight, Crown, Trash2,
} from 'lucide-react';

interface EnrollmentCardProps {
  enrollment: any;
  isActive: boolean;
  industryProofPoints: number;
  enrollmentsCount: number;
  getModeName: (modeId: string | null | undefined) => string | null;
  onSwitch: (id: string) => void;
  onContinue: (id: string) => void;
  onReview: (id: string) => void;
  onSetPrimary: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  setPrimaryPending: boolean;
}

export function DashboardEnrollmentCard({
  enrollment, isActive, industryProofPoints, enrollmentsCount,
  getModeName, onSwitch, onContinue, onReview, onSetPrimary, onDelete,
  setPrimaryPending,
}: EnrollmentCardProps) {
  const progress = getEnrollmentProgress(enrollment.lifecycle_status);
  const isTerminal = TERMINAL_STATUSES.includes(enrollment.lifecycle_status);
  const industryName = enrollment.industry_segment?.name || 'Unknown Industry';

  return (
    <div
      className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'hover:bg-muted/50'
      } ${isTerminal && enrollment.lifecycle_status !== 'not_certified'
          ? 'border-green-500/30 bg-green-500/5'
          : ''
      } ${enrollment.lifecycle_status === 'not_certified'
          ? 'border-destructive/30 bg-destructive/5'
          : ''
      }`}
      onClick={() => onSwitch(enrollment.id)}
    >
      {/* Primary Badge */}
      {enrollment.is_primary && (
        <Badge variant="outline" className="absolute -top-2 right-4 bg-background text-xs">
          Primary
        </Badge>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4">
        {/* Industry Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
          isTerminal && enrollment.lifecycle_status !== 'not_certified'
            ? 'bg-green-500/10 text-green-600'
            : enrollment.lifecycle_status === 'not_certified'
              ? 'bg-destructive/10 text-destructive'
              : isActive
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
        }`}>
          {isTerminal ? getStatusIcon(enrollment.lifecycle_status) || <Building2 className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap min-w-0">
            <h4 className="font-semibold truncate">{industryName}</h4>
            <Badge variant={getStatusBadgeVariant(enrollment.lifecycle_status)} className="gap-1">
              {getStatusIcon(enrollment.lifecycle_status)}
              {getStatusDisplayName(enrollment.lifecycle_status)}
            </Badge>
            {enrollment.lifecycle_status === 'certified' && enrollment.star_rating != null && (
              <StarRating rating={enrollment.star_rating} size="sm" showLabel />
            )}
            {!isTerminal && (
              <span className="text-xs text-muted-foreground">
                Rank {enrollment.lifecycle_rank} ({progress}%)
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 min-w-0">
              <GraduationCap className="h-3 w-3 shrink-0" />
              <span className="truncate">{enrollment.expertise_level?.name || 'Not selected'}</span>
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate">{getModeName(enrollment.participation_mode_id) || 'Not selected'}</span>
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{industryProofPoints} proof points</span>
            </span>
            {enrollment.org_approval_status && (
              <span className="flex items-center gap-1 min-w-0">
                <Briefcase className="h-3 w-3 shrink-0" />
                <span className={`truncate ${
                  enrollment.org_approval_status === 'approved'
                    ? 'text-green-600'
                    : enrollment.org_approval_status === 'pending'
                      ? 'text-amber-600'
                      : 'text-destructive'
                }`}>
                  Org: {enrollment.org_approval_status}
                </span>
              </span>
            )}
          </div>

          {/* Progress Bar + Next Action */}
          {!isTerminal && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Progress value={progress} className="flex-1 h-2" />
                <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                  {progress}%
                </span>
              </div>
              {getNextAction(enrollment.lifecycle_status) && (
                <div className="flex items-center gap-1.5 text-xs">
                  <ClipboardList className="h-3 w-3 text-primary" />
                  <span className="text-primary font-medium">Next:</span>
                  <span className="text-muted-foreground">{getNextAction(enrollment.lifecycle_status)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 mt-3 lg:mt-0 w-full lg:w-auto">
          {!enrollment.is_primary && enrollmentsCount > 1 && (
            <Button
              variant="ghost" size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(enrollment.id, industryName); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {!enrollment.is_primary && enrollmentsCount > 1 && (
            <Button
              variant="ghost" size="sm"
              className="text-muted-foreground hover:text-foreground"
              disabled={setPrimaryPending}
              onClick={(e) => { e.stopPropagation(); onSetPrimary(enrollment.id, industryName); }}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden lg:inline ml-1">Set Primary</span>
            </Button>
          )}
          {isTerminal ? (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onSwitch(enrollment.id); }}>
              View <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : enrollment.lifecycle_rank >= 100 ? (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); onReview(enrollment.id); }}>
                Review
              </Button>
              <Button variant={isActive ? 'default' : 'outline'} size="sm"
                onClick={(e) => { e.stopPropagation(); onContinue(enrollment.id); }}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant={isActive ? 'default' : 'outline'} size="sm"
              onClick={(e) => { e.stopPropagation(); onContinue(enrollment.id); }}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
