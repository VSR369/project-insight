import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InterviewKitHeader } from "./InterviewKitHeader";
import { InterviewKitFooter } from "./InterviewKitFooter";
import { InterviewKitSection } from "./InterviewKitSection";
import { useCandidateProofPoints } from "@/hooks/queries/useCandidateProofPoints";
import { useInterviewKitCompetencies } from "@/hooks/queries/useInterviewKitCompetencies";
import { toast } from "sonner";

interface InterviewKitTabContentProps {
  enrollmentId: string;
}

// Static section configuration
const STATIC_SECTIONS = [
  {
    id: "domain",
    name: "Domain & Delivery Depth",
    type: "domain" as const,
    displayOrder: 1,
    questionCount: 5, // Placeholder for future
    maxScore: 25,
  },
];

export function InterviewKitTabContent({ enrollmentId }: InterviewKitTabContentProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { 
    data: proofPointsData, 
    isLoading: proofPointsLoading, 
    error: proofPointsError 
  } = useCandidateProofPoints(enrollmentId);

  const { 
    data: competencies, 
    isLoading: competenciesLoading, 
    error: competenciesError 
  } = useInterviewKitCompetencies();

  const isLoading = proofPointsLoading || competenciesLoading;
  const error = proofPointsError || competenciesError;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load interview kit data: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Build sections array
  const proofPointCount = proofPointsData?.totalCount || 0;
  
  const sections = [
    // Static domain section
    ...STATIC_SECTIONS.map((s) => ({
      id: s.id,
      name: s.name,
      questionCount: s.questionCount,
      score: 0,
      maxScore: s.maxScore,
      ratedCount: 0,
      totalCount: s.questionCount,
    })),
    // Proof points section (dynamic count)
    {
      id: "proof_points",
      name: "Proof Points Deep-Dive",
      questionCount: proofPointCount,
      score: 0,
      maxScore: proofPointCount * 5,
      ratedCount: 0,
      totalCount: proofPointCount,
    },
    // Competency sections from database
    ...(competencies || []).map((c) => ({
      id: c.id,
      name: c.name,
      questionCount: 3, // Placeholder: 3 questions per competency
      score: 0,
      maxScore: 15, // 3 questions × 5 points
      ratedCount: 0,
      totalCount: 3,
    })),
  ];

  // Calculate overall stats
  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);
  const totalRated = sections.reduce((sum, s) => sum + s.ratedCount, 0);
  const allRated = totalQuestions > 0 && totalRated === totalQuestions;

  return (
    <div className="space-y-6">
      <InterviewKitHeader />

      <div className="space-y-3">
        {sections.map((section) => (
          <InterviewKitSection
            key={section.id}
            name={section.name}
            questionCount={section.questionCount}
            score={section.score}
            maxScore={section.maxScore}
            ratedCount={section.ratedCount}
            totalCount={section.totalCount}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      <InterviewKitFooter allRated={allRated} onExport={handleExport} />
    </div>
  );
}
