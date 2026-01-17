/**
 * EnrollmentSwitcher Component
 * 
 * A dropdown component for switching between industry enrollments.
 * Shows the current active industry and allows quick context switching.
 */

import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, Plus, Crown, Factory } from 'lucide-react';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LifecycleProgressIndicator } from './LifecycleProgressIndicator';

const TERMINAL_STATUSES = ['verified', 'certified', 'not_verified'];

interface EnrollmentSwitcherProps {
  variant?: 'header' | 'compact';
}

export function EnrollmentSwitcher({ variant = 'header' }: EnrollmentSwitcherProps) {
  const navigate = useNavigate();
  const context = useOptionalEnrollmentContext();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();

  // Don't render if no context or loading
  if (!context || providerLoading) {
    return variant === 'header' ? (
      <Skeleton className="h-9 w-40" />
    ) : null;
  }

  const { 
    enrollments, 
    activeEnrollment, 
    setActiveEnrollment, 
    isLoading,
    hasMultipleIndustries 
  } = context;

  // Don't render if loading or no enrollments
  if (isLoading) {
    return variant === 'header' ? (
      <Skeleton className="h-9 w-40" />
    ) : null;
  }

  // Don't render if no enrollments
  if (enrollments.length === 0) {
    return null;
  }

  const isTerminal = (status: string) => TERMINAL_STATUSES.includes(status);

  const handleSwitch = (enrollmentId: string) => {
    setActiveEnrollment(enrollmentId);
  };

  const handleAddIndustry = () => {
    navigate('/enroll/registration?mode=add-industry');
  };

  // Compact variant for sidebar (icon only when collapsed)
  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1 text-left">
              {activeEnrollment?.industry_segment?.name || 'Select Industry'}
            </span>
            {hasMultipleIndustries && <ChevronDown className="h-3 w-3 shrink-0" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-popover">
          <DropdownMenuLabel>Switch Industry</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {enrollments.map((enrollment) => (
            <DropdownMenuItem
              key={enrollment.id}
              onClick={() => handleSwitch(enrollment.id)}
              className="flex items-center gap-2"
            >
              {activeEnrollment?.id === enrollment.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
              {activeEnrollment?.id !== enrollment.id && (
                <div className="w-4" />
              )}
              <span className="flex-1 truncate">
                {enrollment.industry_segment?.name}
              </span>
              {enrollment.is_primary && (
                <Crown className="h-3 w-3 text-amber-500" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAddIndustry} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Industry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Header variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 max-w-[200px] bg-background"
        >
          <Factory className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate hidden sm:inline">
            {activeEnrollment?.industry_segment?.name || 'Select Industry'}
          </span>
          {hasMultipleIndustries && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {enrollments.length}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 bg-popover">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Industry Enrollments</span>
          <Badge variant="outline" className="text-xs">
            {enrollments.length} {enrollments.length === 1 ? 'industry' : 'industries'}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto">
          {enrollments.map((enrollment) => {
            const terminal = isTerminal(enrollment.lifecycle_status);
            const isActive = activeEnrollment?.id === enrollment.id;

            return (
              <DropdownMenuItem
                key={enrollment.id}
                onClick={() => handleSwitch(enrollment.id)}
                className={`flex flex-col items-start gap-2 p-3 cursor-pointer ${
                  isActive ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                  {!isActive && <div className="w-4 shrink-0" />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {enrollment.industry_segment?.name}
                      </span>
                      {enrollment.is_primary && (
                        <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {enrollment.expertise_level && (
                        <span className="text-xs text-muted-foreground">
                          {enrollment.expertise_level.name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Compact lifecycle progress indicator */}
                  <LifecycleProgressIndicator
                    currentStatus={enrollment.lifecycle_status}
                    currentRank={enrollment.lifecycle_rank}
                    compact
                  />
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleAddIndustry} 
          className="gap-2 text-primary"
        >
          <Plus className="h-4 w-4" />
          Add New Industry
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
