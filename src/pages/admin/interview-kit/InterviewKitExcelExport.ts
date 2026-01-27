/**
 * Interview KIT Excel Export Utilities
 * Per Project Knowledge patterns for Excel import/export
 */

import * as XLSX from "xlsx";
import type { 
  InterviewKitQuestionWithRelations, 
  InterviewKitCompetency 
} from "@/hooks/queries/useInterviewKitQuestions";

// Template column definitions
const TEMPLATE_HEADERS = [
  "industry_segment",
  "expertise_level",
  "competency",
  "question_text",
  "expected_answer",
];

const INSTRUCTIONS_DATA = [
  ["Column", "Description", "Required", "Notes"],
  ["industry_segment", "Name of the industry segment", "Yes", "Must match existing segment (e.g., 'Technology', 'Healthcare')"],
  ["expertise_level", "Name of the expertise level", "Yes", "Must match existing level (e.g., 'Senior', 'Expert')"],
  ["competency", "Competency code or name", "Yes", "Use code (e.g., 'solution_design') or full name"],
  ["question_text", "The interview question", "Yes", "10-2000 characters"],
  ["expected_answer", "Expected answer guidance", "No", "Max 3000 characters, optional"],
];

const SAMPLE_DATA = [
  [
    "Technology",
    "Senior",
    "solution_design",
    "Describe your approach to designing a scalable system architecture for a high-traffic e-commerce platform.",
    "Look for: understanding of load balancing, caching strategies, database sharding, microservices vs monolith trade-offs.",
  ],
  [
    "Technology",
    "Senior",
    "execution_governance",
    "How do you ensure project delivery stays on track when facing unexpected technical challenges?",
    "Look for: risk management, stakeholder communication, prioritization frameworks, contingency planning.",
  ],
  [
    "Healthcare",
    "Expert",
    "soft_skills",
    "Describe a situation where you had to influence stakeholders without direct authority.",
    "Look for: influence strategies, relationship building, understanding stakeholder motivations.",
  ],
];

/**
 * Download an empty template for importing questions
 */
export function downloadInterviewKitTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Data sheet with headers and sample rows
  const dataSheet = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ...SAMPLE_DATA,
  ]);

  // Set column widths
  dataSheet["!cols"] = [
    { wch: 20 }, // industry_segment
    { wch: 18 }, // expertise_level
    { wch: 25 }, // competency
    { wch: 80 }, // question_text
    { wch: 60 }, // expected_answer
  ];

  XLSX.utils.book_append_sheet(wb, dataSheet, "Questions");

  // Instructions sheet
  const instrSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_DATA);
  instrSheet["!cols"] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 10 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, instrSheet, "Instructions");

  // Download
  const fileName = `interview_kit_template_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export current questions data to Excel
 */
export function exportInterviewKitQuestions(
  questions: InterviewKitQuestionWithRelations[],
  competencies: InterviewKitCompetency[]
): void {
  const competencyMap = new Map(competencies.map((c) => [c.id, c]));

  const exportData = questions.map((q) => ({
    industry_segment: q.industry_segments?.name || "",
    expertise_level: q.expertise_levels?.name || "",
    competency: competencyMap.get(q.competency_id)?.code || q.competency_id,
    question_text: q.question_text,
    expected_answer: q.expected_answer || "",
    is_active: q.is_active ? "Yes" : "No",
    created_at: new Date(q.created_at).toLocaleDateString(),
  }));

  const wb = XLSX.utils.book_new();

  // Questions data
  const ws = XLSX.utils.json_to_sheet(exportData);
  ws["!cols"] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 25 },
    { wch: 80 },
    { wch: 60 },
    { wch: 10 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Questions");

  // Summary sheet
  const summaryData = [
    ["Interview KIT Questions Export"],
    [""],
    ["Export Date", new Date().toISOString()],
    ["Total Questions", questions.length.toString()],
    ["Active Questions", questions.filter((q) => q.is_active).length.toString()],
    ["Inactive Questions", questions.filter((q) => !q.is_active).length.toString()],
    [""],
    ["Questions by Competency"],
    ...competencies.map((c) => [
      c.name,
      questions.filter((q) => q.competency_id === c.id).length.toString(),
    ]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 40 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Download
  const fileName = `interview_kit_questions_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Parse Excel file for import
 */
export interface ParsedQuestion {
  rowNumber: number;
  industry_segment: string;
  expertise_level: string;
  competency: string;
  question_text: string;
  expected_answer: string;
  errors: string[];
}

export async function parseInterviewKitExcel(file: File): Promise<ParsedQuestion[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });

  // Find data sheet
  const wsName = wb.SheetNames.find(
    (n) => n.toLowerCase() === "questions" || n.toLowerCase() === "data"
  ) || wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  // Convert to JSON, skip header row
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    defval: "",
    raw: false,
  });

  return rows.map((row, index) => {
    const errors: string[] = [];
    const rowNumber = index + 2; // +2 for header row + 1-based indexing

    // Normalize column names (handle case variations)
    const normalizedRow: Record<string, string> = {};
    Object.keys(row).forEach((key) => {
      normalizedRow[key.toLowerCase().trim().replace(/\s+/g, "_")] = row[key];
    });

    const industry_segment = (normalizedRow.industry_segment || "").trim();
    const expertise_level = (normalizedRow.expertise_level || "").trim();
    const competency = (normalizedRow.competency || "").trim();
    const question_text = (normalizedRow.question_text || "").trim();
    const expected_answer = (normalizedRow.expected_answer || "").trim();

    // Validation
    if (!industry_segment) {
      errors.push("Industry segment is required");
    }
    if (!expertise_level) {
      errors.push("Expertise level is required");
    }
    if (!competency) {
      errors.push("Competency is required");
    }
    if (!question_text) {
      errors.push("Question text is required");
    } else if (question_text.length < 10) {
      errors.push("Question text must be at least 10 characters");
    } else if (question_text.length > 2000) {
      errors.push("Question text must be 2000 characters or less");
    }
    if (expected_answer && expected_answer.length > 3000) {
      errors.push("Expected answer must be 3000 characters or less");
    }

    return {
      rowNumber,
      industry_segment,
      expertise_level,
      competency,
      question_text,
      expected_answer,
      errors,
    };
  });
}

/**
 * Export validation errors to Excel
 */
export function exportValidationErrors(questions: ParsedQuestion[]): void {
  const errorRows = questions
    .filter((q) => q.errors.length > 0)
    .map((q) => ({
      row: q.rowNumber,
      industry_segment: q.industry_segment,
      expertise_level: q.expertise_level,
      competency: q.competency,
      question_text: q.question_text.substring(0, 100) + (q.question_text.length > 100 ? "..." : ""),
      errors: q.errors.join("; "),
    }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(errorRows);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 18 },
    { wch: 25 },
    { wch: 50 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Validation Errors");

  const fileName = `interview_kit_import_errors_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
