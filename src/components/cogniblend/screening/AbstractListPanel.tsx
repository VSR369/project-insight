/** AbstractListPanel — left-hand list of submitted abstracts on the screening page. */
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ScreeningAbstract } from '@/hooks/cogniblend/useScreeningReview';
import { StatusBadge } from './ScreeningScoringParts';

export interface AbstractListPanelProps {
  abstracts: ScreeningAbstract[];
  selectedAbstractId: string | null;
  onSelect: (id: string) => void;
  isStructuredMode: boolean;
}

export function AbstractListPanel({ abstracts, selectedAbstractId, onSelect, isStructuredMode }: AbstractListPanelProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Submitted Abstracts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {abstracts.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No abstracts submitted yet.</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {abstracts.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-accent/50 ${
                  selectedAbstractId === a.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {isStructuredMode ? a.anonymousLabel : a.providerName ?? a.anonymousLabel}
                  </span>
                  <StatusBadge status={a.selectionStatus} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'N/A'}
                  {a.weightedTotal != null && ` · Score: ${a.weightedTotal.toFixed(1)}`}
                </p>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
