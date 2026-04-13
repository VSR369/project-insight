/**
 * AffectedDataSummary — Shows what data will be deleted during enrollment removal.
 */

import { FileText, Layers, GraduationCap, CheckCircle2, Calendar } from 'lucide-react';
import type { AffectedData } from '@/services/enrollmentDeletionService';

interface AffectedDataSummaryProps {
  data: AffectedData;
}

export function AffectedDataSummary({ data }: AffectedDataSummaryProps) {
  const items = [
    { count: data.proofPointsCount, icon: FileText, label: 'Proof Point', destructive: false },
    { count: data.proficiencyAreasCount, icon: Layers, label: 'Proficiency Area', destructive: false },
    { count: data.specialitiesCount, icon: GraduationCap, label: 'Specialit', pluralSuffix: 'ies', singularSuffix: 'y', destructive: false },
    { count: data.assessmentAttemptsCount, icon: CheckCircle2, label: 'Assessment', destructive: false },
    { count: data.interviewBookingsCount, icon: Calendar, label: 'Interview', suffix: ' (will be cancelled)', destructive: true },
  ];

  const visibleItems = items.filter(i => i.count > 0);
  if (visibleItems.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-2">Data to be Deleted</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {visibleItems.map((item, i) => {
          const Icon = item.icon;
          const plural = item.count !== 1;
          const suffix = item.pluralSuffix && plural
            ? item.pluralSuffix
            : item.singularSuffix && !plural
              ? item.singularSuffix
              : plural ? 's' : '';
          return (
            <div
              key={i}
              className={`flex items-center gap-2 ${item.destructive ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              <Icon className="h-3 w-3" />
              {item.count} {item.label}{suffix}{item.suffix ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
