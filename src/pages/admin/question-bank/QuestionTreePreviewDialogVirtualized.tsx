import React, { useState, useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  GraduationCap,
  Target,
  Boxes,
  Sparkles,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
  Loader2,
  Database,
} from "lucide-react";
import { useQuestionsWithHierarchy } from "@/hooks/queries/useHierarchyResolver";
import { QuestionPreviewDialog } from "./QuestionPreviewDialog";
import { cn } from "@/lib/utils";
import { getDifficultyDisplay, QuestionDifficulty } from "@/hooks/queries/useQuestionBank";
import { Json } from "@/integrations/supabase/types";

// ===================== TYPES =====================

interface QuestionTreePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuestionNode {
  id: string;
  question_text: string;
  difficulty: QuestionDifficulty | null;
  is_active: boolean;
  question_type: string;
  usage_mode: string;
  correct_option: number;
  options: Json;
  expected_answer_guidance: string | null;
  question_capability_tags?: Array<{
    id: string;
    capability_tag_id: string;
    capability_tags: { id: string; name: string } | null;
  }>;
}

interface SpecialityNode {
  id: string;
  name: string;
  questions: QuestionNode[];
}

interface SubDomainNode {
  id: string;
  name: string;
  specialities: Map<string, SpecialityNode>;
}

interface AreaNode {
  id: string;
  name: string;
  subDomains: Map<string, SubDomainNode>;
}

interface ExpertiseLevelNode {
  id: string;
  name: string;
  level_number?: number;
  areas: Map<string, AreaNode>;
}

interface IndustrySegmentNode {
  id: string;
  name: string;
  expertiseLevels: Map<string, ExpertiseLevelNode>;
}

type TreeData = Map<string, IndustrySegmentNode>;

// Flat row types for virtualization
type FlatRowType = 'industry' | 'level' | 'area' | 'subdomain' | 'speciality' | 'question';

interface FlatRow {
  id: string;
  type: FlatRowType;
  depth: number;
  label: string;
  questionCount: number;
  isExpanded: boolean;
  hasChildren: boolean;
  parentPath: string[];
  // For questions
  question?: QuestionNode;
  specialityName?: string;
}

// ===================== CONSTANTS =====================

const QUESTIONS_PER_SPECIALITY = 20; // Initial questions shown per speciality

// ===================== COMPONENT =====================

export function QuestionTreePreviewDialog({
  open,
  onOpenChange,
}: QuestionTreePreviewDialogProps) {
  const { data: allQuestions, isLoading } = useQuestionsWithHierarchy();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionNode | null>(null);
  const [selectedSpecialityName, setSelectedSpecialityName] = useState<string>("");
  const [expandedQuestionNodes, setExpandedQuestionNodes] = useState<Set<string>>(new Set());
  
  const scrollParentRef = useRef<HTMLDivElement>(null);

  // Build hierarchical tree from flat questions data
  const { treeData, stats } = useMemo(() => {
    const tree: TreeData = new Map();
    let totalQuestions = 0;
    const industries = new Set<string>();
    const levels = new Set<string>();
    const areas = new Set<string>();
    const subDomains = new Set<string>();
    const specialities = new Set<string>();

    if (!allQuestions) {
      return { treeData: tree, stats: { totalQuestions: 0, industries: 0, levels: 0, areas: 0, subDomains: 0, specialities: 0 } };
    }

    for (const q of allQuestions) {
      const speciality = q.specialities;
      if (!speciality) continue;

      const subDomain = speciality.sub_domains;
      if (!subDomain) continue;

      const area = subDomain.proficiency_areas;
      if (!area) continue;

      const industry = area.industry_segments;
      const expertiseLevel = area.expertise_levels;
      if (!industry || !expertiseLevel) continue;

      totalQuestions++;
      industries.add(industry.id);
      levels.add(expertiseLevel.id);
      areas.add(area.id);
      subDomains.add(subDomain.id);
      specialities.add(speciality.id);

      if (!tree.has(industry.id)) {
        tree.set(industry.id, {
          id: industry.id,
          name: industry.name,
          expertiseLevels: new Map(),
        });
      }
      const industryNode = tree.get(industry.id)!;

      if (!industryNode.expertiseLevels.has(expertiseLevel.id)) {
        industryNode.expertiseLevels.set(expertiseLevel.id, {
          id: expertiseLevel.id,
          name: expertiseLevel.name,
          level_number: (expertiseLevel as any).level_number,
          areas: new Map(),
        });
      }
      const levelNode = industryNode.expertiseLevels.get(expertiseLevel.id)!;

      if (!levelNode.areas.has(area.id)) {
        levelNode.areas.set(area.id, {
          id: area.id,
          name: area.name,
          subDomains: new Map(),
        });
      }
      const areaNode = levelNode.areas.get(area.id)!;

      if (!areaNode.subDomains.has(subDomain.id)) {
        areaNode.subDomains.set(subDomain.id, {
          id: subDomain.id,
          name: subDomain.name,
          specialities: new Map(),
        });
      }
      const subDomainNode = areaNode.subDomains.get(subDomain.id)!;

      if (!subDomainNode.specialities.has(speciality.id)) {
        subDomainNode.specialities.set(speciality.id, {
          id: speciality.id,
          name: speciality.name,
          questions: [],
        });
      }
      const specialityNode = subDomainNode.specialities.get(speciality.id)!;

      specialityNode.questions.push({
        id: q.id,
        question_text: q.question_text,
        difficulty: q.difficulty as QuestionDifficulty | null,
        is_active: q.is_active,
        question_type: q.question_type,
        usage_mode: q.usage_mode,
        correct_option: q.correct_option,
        options: q.options,
        expected_answer_guidance: q.expected_answer_guidance,
        question_capability_tags: q.question_capability_tags,
      });
    }

    return {
      treeData: tree,
      stats: {
        totalQuestions,
        industries: industries.size,
        levels: levels.size,
        areas: areas.size,
        subDomains: subDomains.size,
        specialities: specialities.size,
      },
    };
  }, [allQuestions]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return treeData;

    const query = searchQuery.toLowerCase();
    const filtered: TreeData = new Map();

    for (const [industryId, industry] of treeData) {
      const industryMatches = industry.name.toLowerCase().includes(query);
      const filteredLevels: Map<string, ExpertiseLevelNode> = new Map();

      for (const [levelId, level] of industry.expertiseLevels) {
        const levelMatches = level.name.toLowerCase().includes(query);
        const filteredAreas: Map<string, AreaNode> = new Map();

        for (const [areaId, area] of level.areas) {
          const areaMatches = area.name.toLowerCase().includes(query);
          const filteredSubDomains: Map<string, SubDomainNode> = new Map();

          for (const [subDomainId, subDomain] of area.subDomains) {
            const subDomainMatches = subDomain.name.toLowerCase().includes(query);
            const filteredSpecialities: Map<string, SpecialityNode> = new Map();

            for (const [specialityId, speciality] of subDomain.specialities) {
              const specialityMatches = speciality.name.toLowerCase().includes(query);
              const filteredQuestions = speciality.questions.filter(q =>
                q.question_text.toLowerCase().includes(query)
              );

              if (industryMatches || levelMatches || areaMatches || subDomainMatches || specialityMatches || filteredQuestions.length > 0) {
                filteredSpecialities.set(specialityId, {
                  ...speciality,
                  questions: filteredQuestions.length > 0 ? filteredQuestions : speciality.questions,
                });
              }
            }

            if (filteredSpecialities.size > 0) {
              filteredSubDomains.set(subDomainId, { ...subDomain, specialities: filteredSpecialities });
            }
          }

          if (filteredAreas.size > 0 || filteredSubDomains.size > 0) {
            filteredAreas.set(areaId, { ...area, subDomains: filteredSubDomains });
          }
        }

        if (filteredAreas.size > 0) {
          filteredLevels.set(levelId, { ...level, areas: filteredAreas });
        }
      }

      if (filteredLevels.size > 0) {
        filtered.set(industryId, { ...industry, expertiseLevels: filteredLevels });
      }
    }

    return filtered;
  }, [treeData, searchQuery]);

  // Flatten tree for virtualization
  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = [];

    const countQuestions = (node: any): number => {
      if (node.questions) return node.questions.length;
      if (node.specialities) {
        let count = 0;
        for (const s of node.specialities.values()) count += s.questions.length;
        return count;
      }
      if (node.subDomains) {
        let count = 0;
        for (const sd of node.subDomains.values()) count += countQuestions(sd);
        return count;
      }
      if (node.areas) {
        let count = 0;
        for (const a of node.areas.values()) count += countQuestions(a);
        return count;
      }
      if (node.expertiseLevels) {
        let count = 0;
        for (const l of node.expertiseLevels.values()) count += countQuestions(l);
        return count;
      }
      return 0;
    };

    for (const industry of Array.from(filteredTree.values()).sort((a, b) => a.name.localeCompare(b.name))) {
      const industryExpanded = expandedNodes.has(industry.id);
      rows.push({
        id: industry.id,
        type: 'industry',
        depth: 0,
        label: industry.name,
        questionCount: countQuestions(industry),
        isExpanded: industryExpanded,
        hasChildren: industry.expertiseLevels.size > 0,
        parentPath: [],
      });

      if (!industryExpanded) continue;

      for (const level of Array.from(industry.expertiseLevels.values()).sort((a, b) => (a.level_number || 0) - (b.level_number || 0))) {
        const levelExpanded = expandedNodes.has(level.id);
        rows.push({
          id: level.id,
          type: 'level',
          depth: 1,
          label: level.name,
          questionCount: countQuestions(level),
          isExpanded: levelExpanded,
          hasChildren: level.areas.size > 0,
          parentPath: [industry.id],
        });

        if (!levelExpanded) continue;

        for (const area of Array.from(level.areas.values()).sort((a, b) => a.name.localeCompare(b.name))) {
          const areaExpanded = expandedNodes.has(area.id);
          rows.push({
            id: area.id,
            type: 'area',
            depth: 2,
            label: area.name,
            questionCount: countQuestions(area),
            isExpanded: areaExpanded,
            hasChildren: area.subDomains.size > 0,
            parentPath: [industry.id, level.id],
          });

          if (!areaExpanded) continue;

          for (const subDomain of Array.from(area.subDomains.values()).sort((a, b) => a.name.localeCompare(b.name))) {
            const subDomainExpanded = expandedNodes.has(subDomain.id);
            rows.push({
              id: subDomain.id,
              type: 'subdomain',
              depth: 3,
              label: subDomain.name,
              questionCount: countQuestions(subDomain),
              isExpanded: subDomainExpanded,
              hasChildren: subDomain.specialities.size > 0,
              parentPath: [industry.id, level.id, area.id],
            });

            if (!subDomainExpanded) continue;

            for (const speciality of Array.from(subDomain.specialities.values()).sort((a, b) => a.name.localeCompare(b.name))) {
              const specialityExpanded = expandedNodes.has(speciality.id);
              const showAllQuestions = expandedQuestionNodes.has(speciality.id);
              const visibleQuestions = showAllQuestions 
                ? speciality.questions 
                : speciality.questions.slice(0, QUESTIONS_PER_SPECIALITY);
              const hasMoreQuestions = speciality.questions.length > QUESTIONS_PER_SPECIALITY && !showAllQuestions;

              rows.push({
                id: speciality.id,
                type: 'speciality',
                depth: 4,
                label: speciality.name,
                questionCount: speciality.questions.length,
                isExpanded: specialityExpanded,
                hasChildren: speciality.questions.length > 0,
                parentPath: [industry.id, level.id, area.id, subDomain.id],
              });

              if (!specialityExpanded) continue;

              for (const question of visibleQuestions) {
                rows.push({
                  id: question.id,
                  type: 'question',
                  depth: 5,
                  label: question.question_text,
                  questionCount: 0,
                  isExpanded: false,
                  hasChildren: false,
                  parentPath: [industry.id, level.id, area.id, subDomain.id, speciality.id],
                  question,
                  specialityName: speciality.name,
                });
              }

              // Add "Show more" row if needed
              if (hasMoreQuestions) {
                rows.push({
                  id: `more-${speciality.id}`,
                  type: 'question',
                  depth: 5,
                  label: `Show ${speciality.questions.length - QUESTIONS_PER_SPECIALITY} more questions...`,
                  questionCount: speciality.questions.length - QUESTIONS_PER_SPECIALITY,
                  isExpanded: false,
                  hasChildren: false,
                  parentPath: [industry.id, level.id, area.id, subDomain.id, speciality.id],
                  specialityName: speciality.name,
                });
              }
            }
          }
        }
      }
    }

    return rows;
  }, [filteredTree, expandedNodes, expandedQuestionNodes]);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const toggleShowMore = useCallback((specialityId: string) => {
    setExpandedQuestionNodes(prev => {
      const next = new Set(prev);
      if (next.has(specialityId)) {
        next.delete(specialityId);
      } else {
        next.add(specialityId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allNodeIds = new Set<string>();
    for (const industry of filteredTree.values()) {
      allNodeIds.add(industry.id);
      for (const level of industry.expertiseLevels.values()) {
        allNodeIds.add(level.id);
        for (const area of level.areas.values()) {
          allNodeIds.add(area.id);
          for (const subDomain of area.subDomains.values()) {
            allNodeIds.add(subDomain.id);
            for (const speciality of subDomain.specialities.values()) {
              allNodeIds.add(speciality.id);
            }
          }
        }
      }
    }
    setExpandedNodes(allNodeIds);
  }, [filteredTree]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
    setExpandedQuestionNodes(new Set());
  }, []);

  const handleQuestionClick = useCallback((question: QuestionNode, specialityName: string) => {
    setSelectedQuestion(question);
    setSelectedSpecialityName(specialityName);
  }, []);

  const getIconForType = (type: FlatRowType) => {
    switch (type) {
      case 'industry': return <Building2 className="h-4 w-4 text-primary flex-shrink-0" />;
      case 'level': return <GraduationCap className="h-4 w-4 text-purple-500 flex-shrink-0" />;
      case 'area': return <Target className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'subdomain': return <Boxes className="h-4 w-4 text-orange-500 flex-shrink-0" />;
      case 'speciality': return <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />;
      case 'question': return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />;
    }
  };

  const renderRow = (row: FlatRow, style: React.CSSProperties) => {
    const paddingLeft = row.depth * 16 + 8;

    // Handle "Show more" row
    if (row.id.startsWith('more-')) {
      const specialityId = row.id.replace('more-', '');
      return (
        <div
          style={style}
          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors text-primary"
          onClick={() => toggleShowMore(specialityId)}
        >
          <div style={{ paddingLeft: `${paddingLeft}px` }} className="flex items-center gap-2 flex-1">
            <ChevronDown className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">{row.label}</span>
          </div>
        </div>
      );
    }

    // Question row
    if (row.type === 'question' && row.question) {
      const difficultyConfig = row.question.difficulty ? getDifficultyDisplay(row.question.difficulty) : null;
      const truncatedText = row.question.question_text.length > 80
        ? row.question.question_text.substring(0, 80) + "..."
        : row.question.question_text;

      return (
        <div
          style={style}
          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => handleQuestionClick(row.question!, row.specialityName!)}
        >
          <div style={{ paddingLeft: `${paddingLeft}px` }} className="flex items-center gap-2 flex-1 min-w-0">
            {getIconForType('question')}
            <span className="text-sm text-muted-foreground truncate flex-1">
              {truncatedText}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {difficultyConfig && (
              <Badge
                variant="outline"
                className={cn("text-xs px-1.5 py-0", difficultyConfig.color, difficultyConfig.bgColor)}
              >
                {difficultyConfig.label}
              </Badge>
            )}
            {!row.question.is_active && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      );
    }

    // Tree node row
    return (
      <div
        style={style}
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => toggleNode(row.id)}
      >
        <div style={{ paddingLeft: `${paddingLeft}px` }} className="flex items-center gap-2 flex-1 min-w-0">
          {row.hasChildren ? (
            row.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}
          {getIconForType(row.type)}
          <span className="font-medium text-sm truncate flex-1">{row.label}</span>
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {row.questionCount}
        </Badge>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Question Bank Tree Preview
            </DialogTitle>
            {!isLoading && (
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground pt-2">
                <Badge variant="outline">{stats.totalQuestions.toLocaleString()} Questions</Badge>
                <Badge variant="outline">{stats.industries} Industries</Badge>
                <Badge variant="outline">{stats.levels} Levels</Badge>
                <Badge variant="outline">{stats.areas} Areas</Badge>
                <Badge variant="outline">{stats.subDomains} Sub-Domains</Badge>
                <Badge variant="outline">{stats.specialities} Specialities</Badge>
              </div>
            )}
          </DialogHeader>

          <div className="flex items-center gap-2 py-2 border-b">
            <Button variant="outline" size="sm" onClick={expandAll}>
              <ChevronsUpDown className="h-4 w-4 mr-1" />
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <div className="flex-1" />
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div 
            ref={scrollParentRef}
            className="flex-1 overflow-y-auto min-h-0"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <Database className="h-12 w-12 text-muted-foreground/30" />
                  <Loader2 className="h-6 w-6 animate-spin text-primary absolute -top-1 -right-1" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium text-muted-foreground">Loading Question Bank...</p>
                  <p className="text-sm text-muted-foreground/70">
                    Fetching questions with full hierarchy data
                  </p>
                </div>
                <div className="w-48">
                  <Progress value={undefined} className="h-2 animate-pulse" />
                </div>
              </div>
            ) : filteredTree.size === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No questions match your search" : "No questions found in the database"}
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = flatRows[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {renderRow(row, { height: virtualRow.size })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedQuestion && (
        <QuestionPreviewDialog
          open={!!selectedQuestion}
          onOpenChange={(open) => {
            if (!open) setSelectedQuestion(null);
          }}
          question={{
            id: selectedQuestion.id,
            question_text: selectedQuestion.question_text,
            options: selectedQuestion.options,
            correct_option: selectedQuestion.correct_option,
            difficulty: selectedQuestion.difficulty,
            question_type: selectedQuestion.question_type as any,
            usage_mode: selectedQuestion.usage_mode as any,
            is_active: selectedQuestion.is_active,
            expected_answer_guidance: selectedQuestion.expected_answer_guidance,
            question_capability_tags: selectedQuestion.question_capability_tags,
            speciality_id: "",
            created_at: "",
            updated_at: null,
            created_by: null,
            updated_by: null,
          }}
          specialityName={selectedSpecialityName}
        />
      )}
    </>
  );
}
