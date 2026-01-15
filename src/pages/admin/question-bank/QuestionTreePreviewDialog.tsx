import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { useQuestionsWithHierarchy } from "@/hooks/queries/useHierarchyResolver";
import { QuestionPreviewDialog } from "./QuestionPreviewDialog";
import { cn } from "@/lib/utils";
import { getDifficultyDisplay, QuestionDifficulty } from "@/hooks/queries/useQuestionBank";
import { Json } from "@/integrations/supabase/types";

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

export function QuestionTreePreviewDialog({
  open,
  onOpenChange,
}: QuestionTreePreviewDialogProps) {
  const { data: allQuestions, isLoading } = useQuestionsWithHierarchy();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionNode | null>(null);
  const [selectedSpecialityName, setSelectedSpecialityName] = useState<string>("");

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

      // Track stats
      totalQuestions++;
      industries.add(industry.id);
      levels.add(expertiseLevel.id);
      areas.add(area.id);
      subDomains.add(subDomain.id);
      specialities.add(speciality.id);

      // Build tree structure
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

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allNodeIds = new Set<string>();
    for (const [industryId, industry] of filteredTree) {
      allNodeIds.add(industryId);
      for (const [levelId, level] of industry.expertiseLevels) {
        allNodeIds.add(levelId);
        for (const [areaId, area] of level.areas) {
          allNodeIds.add(areaId);
          for (const [subDomainId, subDomain] of area.subDomains) {
            allNodeIds.add(subDomainId);
            for (const [specialityId] of subDomain.specialities) {
              allNodeIds.add(specialityId);
            }
          }
        }
      }
    }
    setExpandedNodes(allNodeIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const countQuestions = (node: IndustrySegmentNode | ExpertiseLevelNode | AreaNode | SubDomainNode | SpecialityNode): number => {
    if ('questions' in node) {
      return node.questions.length;
    }
    if ('specialities' in node) {
      let count = 0;
      for (const spec of node.specialities.values()) {
        count += spec.questions.length;
      }
      return count;
    }
    if ('subDomains' in node) {
      let count = 0;
      for (const sd of node.subDomains.values()) {
        count += countQuestions(sd);
      }
      return count;
    }
    if ('areas' in node) {
      let count = 0;
      for (const area of node.areas.values()) {
        count += countQuestions(area);
      }
      return count;
    }
    if ('expertiseLevels' in node) {
      let count = 0;
      for (const level of node.expertiseLevels.values()) {
        count += countQuestions(level);
      }
      return count;
    }
    return 0;
  };

  const handleQuestionClick = (question: QuestionNode, specialityName: string) => {
    setSelectedQuestion(question);
    setSelectedSpecialityName(specialityName);
  };

  const renderQuestion = (question: QuestionNode, specialityName: string) => {
    const difficultyConfig = question.difficulty ? getDifficultyDisplay(question.difficulty) : null;
    const truncatedText = question.question_text.length > 80
      ? question.question_text.substring(0, 80) + "..."
      : question.question_text;

    return (
      <div
        key={question.id}
        className="flex items-center gap-2 py-1.5 px-2 ml-6 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => handleQuestionClick(question, specialityName)}
      >
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-muted-foreground flex-1 truncate">
          {truncatedText}
        </span>
        {difficultyConfig && (
          <Badge
            variant="outline"
            className={cn("text-xs px-1.5 py-0", difficultyConfig.color, difficultyConfig.bgColor)}
          >
            {difficultyConfig.label}
          </Badge>
        )}
        {!question.is_active && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            Inactive
          </Badge>
        )}
      </div>
    );
  };

  const renderTreeNode = (
    label: string,
    icon: React.ReactNode,
    nodeId: string,
    questionCount: number,
    children: React.ReactNode,
    level: number
  ) => {
    const isExpanded = expandedNodes.has(nodeId);
    const paddingLeft = level * 16;

    return (
      <div key={nodeId}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => toggleNode(nodeId)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          {icon}
          <span className="font-medium text-sm flex-1">{label}</span>
          <Badge variant="secondary" className="text-xs">
            {questionCount}
          </Badge>
        </div>
        {isExpanded && <div className="ml-2">{children}</div>}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Question Bank Tree Preview
            </DialogTitle>
            {!isLoading && (
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground pt-2">
                <Badge variant="outline">{stats.totalQuestions} Questions</Badge>
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

          <ScrollArea className="flex-1 pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredTree.size === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No questions match your search" : "No questions found in the database"}
              </div>
            ) : (
              <div className="space-y-1 py-2">
                {Array.from(filteredTree.values())
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((industry) => (
                    renderTreeNode(
                      industry.name,
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />,
                      industry.id,
                      countQuestions(industry),
                      Array.from(industry.expertiseLevels.values())
                        .sort((a, b) => (a.level_number || 0) - (b.level_number || 0))
                        .map((level) => (
                          renderTreeNode(
                            level.name,
                            <GraduationCap className="h-4 w-4 text-purple-500 flex-shrink-0" />,
                            level.id,
                            countQuestions(level),
                            Array.from(level.areas.values())
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((area) => (
                                renderTreeNode(
                                  area.name,
                                  <Target className="h-4 w-4 text-green-500 flex-shrink-0" />,
                                  area.id,
                                  countQuestions(area),
                                  Array.from(area.subDomains.values())
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((subDomain) => (
                                      renderTreeNode(
                                        subDomain.name,
                                        <Boxes className="h-4 w-4 text-orange-500 flex-shrink-0" />,
                                        subDomain.id,
                                        countQuestions(subDomain),
                                        Array.from(subDomain.specialities.values())
                                          .sort((a, b) => a.name.localeCompare(b.name))
                                          .map((speciality) => (
                                            renderTreeNode(
                                              speciality.name,
                                              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />,
                                              speciality.id,
                                              speciality.questions.length,
                                              <div className="space-y-0.5">
                                                {speciality.questions.map((q) =>
                                                  renderQuestion(q, speciality.name)
                                                )}
                                              </div>,
                                              5
                                            )
                                          )),
                                        4
                                      )
                                    )),
                                  3
                                )
                              )),
                            2
                          )
                        )),
                      1
                    )
                  ))}
              </div>
            )}
          </ScrollArea>
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
