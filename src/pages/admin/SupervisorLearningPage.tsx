/**
 * SupervisorLearningPage — Admin dashboard for the Curator Learning Corpus.
 * Shows correction stats, pipeline actions, and a filterable corrections table.
 */

import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCuratorCorrections } from '@/hooks/queries/useCuratorCorrections';
import { LearningCorpusStats } from '@/components/admin/learning/LearningCorpusStats';
import { CorrectionsTable } from '@/components/admin/learning/CorrectionsTable';
import { PipelineActions } from '@/components/admin/learning/PipelineActions';

export default function SupervisorLearningPage() {
  const [filterAction, setFilterAction] = useState('all');
  const [filterSection, setFilterSection] = useState('all');

  const { corrections, stats, isLoading } = useCuratorCorrections({
    action: filterAction,
    sectionKey: filterSection,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Curator Learning Corpus
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor how curators interact with AI suggestions. Trigger embedding generation and pattern extraction.
        </p>
      </div>

      <LearningCorpusStats stats={stats} />
      <PipelineActions />
      <CorrectionsTable
        corrections={corrections}
        filterAction={filterAction}
        filterSection={filterSection}
        onFilterAction={setFilterAction}
        onFilterSection={setFilterSection}
      />
    </div>
  );
}
