import * as React from "react";
import { ChevronDown, ChevronRight, GraduationCap, BookOpen, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AcademicTreePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubjectNode {
  id: string;
  name: string;
}

interface StreamNode {
  id: string;
  name: string;
  subjects: SubjectNode[];
}

interface DisciplineNode {
  id: string;
  name: string;
  streams: StreamNode[];
}

export function AcademicTreePreview({
  open,
  onOpenChange,
}: AcademicTreePreviewProps) {
  const [treeData, setTreeData] = React.useState<DisciplineNode[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [expandedDisciplines, setExpandedDisciplines] = React.useState<Set<string>>(new Set());
  const [expandedStreams, setExpandedStreams] = React.useState<Set<string>>(new Set());

  // Fetch full tree when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchTreeData();
    }
  }, [open]);

  const fetchTreeData = async () => {
    setIsLoading(true);
    try {
      // Fetch disciplines
      const { data: disciplines, error: disciplinesError } = await supabase
        .from("academic_disciplines")
        .select("id, name")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (disciplinesError) throw disciplinesError;

      // Fetch streams for all disciplines
      const disciplineIds = disciplines?.map(d => d.id) || [];
      const { data: streams, error: streamsError } = await supabase
        .from("academic_streams")
        .select("id, name, discipline_id")
        .in("discipline_id", disciplineIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (streamsError) throw streamsError;

      // Fetch subjects for all streams
      const streamIds = streams?.map(s => s.id) || [];
      const { data: subjects, error: subjectsError } = await supabase
        .from("academic_subjects")
        .select("id, name, stream_id")
        .in("stream_id", streamIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (subjectsError) throw subjectsError;

      // Build tree structure
      const tree: DisciplineNode[] = (disciplines || []).map(discipline => ({
        id: discipline.id,
        name: discipline.name,
        streams: (streams || [])
          .filter(s => s.discipline_id === discipline.id)
          .map(stream => ({
            id: stream.id,
            name: stream.name,
            subjects: (subjects || [])
              .filter(sub => sub.stream_id === stream.id)
              .map(sub => ({
                id: sub.id,
                name: sub.name,
              })),
          })),
      }));

      setTreeData(tree);
      // Expand all by default
      setExpandedDisciplines(new Set(tree.map(d => d.id)));
      setExpandedStreams(new Set(tree.flatMap(d => d.streams.map(s => s.id))));
    } catch (error) {
      console.error("Failed to fetch tree data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDiscipline = (id: string) => {
    setExpandedDisciplines(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleStream = (id: string) => {
    setExpandedStreams(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDisciplines(new Set(treeData.map(d => d.id)));
    setExpandedStreams(new Set(treeData.flatMap(d => d.streams.map(s => s.id))));
  };

  const collapseAll = () => {
    setExpandedDisciplines(new Set());
    setExpandedStreams(new Set());
  };

  const totalStreams = treeData.reduce((acc, d) => acc + d.streams.length, 0);
  const totalSubjects = treeData.reduce(
    (acc, d) => acc + d.streams.reduce((acc2, s) => acc2 + s.subjects.length, 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Academic Taxonomy Tree Preview
          </DialogTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">Academia</Badge>
            <Badge variant="outline">Level 0: Aspiring Industry Problem Solver</Badge>
            <span className="text-sm text-muted-foreground ml-auto">
              {treeData.length} Disciplines • {totalStreams} Streams • {totalSubjects} Subjects
            </span>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No academic taxonomy data found. Add some disciplines, streams, and subjects to see the tree.
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-1">
                {treeData.map(discipline => (
                  <div key={discipline.id} className="border rounded-lg overflow-hidden">
                    {/* Discipline Level */}
                    <button
                      onClick={() => toggleDiscipline(discipline.id)}
                      className="w-full flex items-center gap-2 p-3 bg-primary/5 hover:bg-primary/10 text-left transition-colors"
                    >
                      {expandedDisciplines.has(discipline.id) ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{discipline.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {discipline.streams.length} streams
                      </Badge>
                    </button>

                    {/* Streams */}
                    {expandedDisciplines.has(discipline.id) && (
                      <div className="pl-4 border-l-2 border-primary/20 ml-3">
                        {discipline.streams.map(stream => (
                          <div key={stream.id}>
                            {/* Stream Level */}
                            <button
                              onClick={() => toggleStream(stream.id)}
                              className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left transition-colors"
                            >
                              {expandedStreams.has(stream.id) ? (
                                <ChevronDown className="h-3 w-3 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              )}
                              <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="text-sm">{stream.name}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {stream.subjects.length}
                              </Badge>
                            </button>

                            {/* Subjects */}
                            {expandedStreams.has(stream.id) && (
                              <div className="pl-6 py-1 space-y-0.5">
                                {stream.subjects.map(subject => (
                                  <div
                                    key={subject.id}
                                    className="flex items-center gap-2 py-1 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <FileText className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="text-xs">{subject.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
