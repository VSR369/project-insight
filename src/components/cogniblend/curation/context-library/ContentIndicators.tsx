/**
 * ContentIndicators — Shows extraction completeness at a glance (Summary, Text, Data).
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContextSource } from './types';

interface ContentIndicatorsProps {
  source: ContextSource;
}

export function ContentIndicators({ source }: ContentIndicatorsProps) {
  const items = [
    { label: 'S', present: !!source.extracted_summary, title: 'Summary' },
    { label: 'T', present: !!source.extracted_text, title: 'Full Text' },
    { label: 'D', present: !!(source.extracted_key_data && Object.keys(source.extracted_key_data).length > 0), title: 'Key Data' },
  ];

  return (
    <div className="flex gap-0.5 ml-1">
      {items.map(({ label, present, title }) => (
        <Badge
          key={label}
          variant="outline"
          title={`${title}: ${present ? 'Available' : 'Missing'}`}
          className={cn(
            'px-1 h-4 text-[9px] font-mono',
            present
              ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
              : 'opacity-30 border-dashed',
          )}
        >
          {label}
        </Badge>
      ))}
    </div>
  );
}
