/**
 * Industry Enrollment Selector
 * 
 * Dropdown component for switching between industry enrollments.
 * Shows lifecycle progress and primary indicator for each industry.
 */

import React, { useState } from 'react';
import { Check, ChevronDown, Plus, Star, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { getStatusDisplayName, LIFECYCLE_RANKS } from '@/services/lifecycleService';
import { AddIndustryDialog } from './AddIndustryDialog';
import { cn } from '@/lib/utils';

interface IndustryEnrollmentSelectorProps {
  className?: string;
  showAddButton?: boolean;
  compact?: boolean;
}

export function IndustryEnrollmentSelector({ 
  className, 
  showAddButton = true,
  compact = false,
}: IndustryEnrollmentSelectorProps) {
  const enrollmentContext = useOptionalEnrollmentContext();
  const [showAddDialog, setShowAddDialog] = useState(false);

  // If no context, don't render
  if (!enrollmentContext) {
    return null;
  }

  const {
    enrollments,
    activeEnrollment,
    setActiveEnrollment,
    isLoading,
    hasMultipleIndustries,
  } = enrollmentContext;

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!activeEnrollment && enrollments.length === 0) {
    return null;
  }

  // Calculate progress percentage (simplified - based on lifecycle rank)
  const getProgressPercent = (lifecycleRank: number) => {
    const maxRank = LIFECYCLE_RANKS.certified; // 140
    return Math.min(100, Math.round((lifecycleRank / maxRank) * 100));
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (status === 'certified') return 'default';
    if (status === 'not_certified' || status === 'suspended') return 'destructive';
    return 'secondary';
  };

  // If only one enrollment and not showing add button, show simpler display
  if (!hasMultipleIndustries && !showAddButton) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-sm font-medium">
          {activeEnrollment?.industry_segment?.name || 'No Industry'}
        </span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "justify-between gap-2",
              compact ? "h-8 px-3" : "h-10",
              className
            )}
          >
            <div className="flex items-center gap-2">
              {activeEnrollment?.is_primary && (
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              )}
              <span className={cn(compact ? "text-xs" : "text-sm")}>
                {activeEnrollment?.industry_segment?.name || 'Select Industry'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Your Industry Enrollments
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {enrollments.map((enrollment) => (
            <DropdownMenuItem
              key={enrollment.id}
              onClick={() => setActiveEnrollment(enrollment.id)}
              className="flex flex-col items-start gap-2 p-3 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {enrollment.is_primary && (
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  )}
                  <span className="font-medium text-sm">
                    {enrollment.industry_segment?.name}
                  </span>
                  {enrollment.id === activeEnrollment?.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <Badge variant={getStatusBadgeVariant(enrollment.lifecycle_status)} className="text-xs">
                  {getStatusDisplayName(enrollment.lifecycle_status)}
                </Badge>
              </div>
              
              <div className="w-full space-y-1">
                <Progress 
                  value={getProgressPercent(enrollment.lifecycle_rank)} 
                  className="h-1.5" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {enrollment.expertise_level?.name || 'No expertise set'}
                  </span>
                  <span>{getProgressPercent(enrollment.lifecycle_rank)}%</span>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          {showAddButton && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-2 p-3 cursor-pointer text-primary"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Industry</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AddIndustryDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
    </>
  );
}
