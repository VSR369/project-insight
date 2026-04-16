/**
 * QualityScoreSummary — Top-of-diagnostics quality summary bar.
 * Shows consistency findings, ambiguity findings, and review level.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';

interface Props {
  consistencyCount: number;
  consistencyErrors: number;
  ambiguityCount: number;
}

export function QualityScoreSummary({ consistencyCount, consistencyErrors, ambiguityCount }: Props) {
  const totalFindings = consistencyCount + ambiguityCount;
  const hasIssues = consistencyErrors > 0;

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Quality Assurance</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>Review: Principal Consultant</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className={`h-3.5 w-3.5 ${hasIssues ? 'text-destructive' : 'text-muted-foreground'}`} />
          <span>Consistency: {consistencyCount} findings</span>
          {consistencyErrors > 0 && (
            <Badge variant="destructive" className="text-[10px]">{consistencyErrors} errors</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Ambiguity: {ambiguityCount} findings</span>
        </div>
      </div>
      {totalFindings === 0 && (
        <Badge variant="secondary" className="text-[10px] ml-auto">All Clear</Badge>
      )}
    </div>
  );
}
