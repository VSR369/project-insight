import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface AcademicTaxonomyExportRow {
  "Discipline": string;
  "Stream": string;
  "Subject": string;
  "Discipline Description": string;
  "Stream Description": string;
  "Subject Description": string;
  "Display Order": number | string;
  "Active": string;
}

/**
 * Downloads an empty template Excel file with headers and sample rows
 */
export async function downloadAcademicTemplate(): Promise<void> {
  const templateData: AcademicTaxonomyExportRow[] = [
    {
      "Discipline": "Engineering",
      "Stream": "Computer Science",
      "Subject": "Data Structures",
      "Discipline Description": "Core engineering and technology disciplines",
      "Stream Description": "Software development and computing",
      "Subject Description": "Fundamental data organization concepts",
      "Display Order": 1,
      "Active": "Yes",
    },
    {
      "Discipline": "Engineering",
      "Stream": "Computer Science",
      "Subject": "Algorithms",
      "Discipline Description": "Core engineering and technology disciplines",
      "Stream Description": "Software development and computing",
      "Subject Description": "Algorithm design and analysis",
      "Display Order": 2,
      "Active": "Yes",
    },
    {
      "Discipline": "Engineering",
      "Stream": "Mechanical",
      "Subject": "Thermodynamics",
      "Discipline Description": "Core engineering and technology disciplines",
      "Stream Description": "Machine and energy systems",
      "Subject Description": "Heat and energy transfer principles",
      "Display Order": 1,
      "Active": "Yes",
    },
    {
      "Discipline": "Science",
      "Stream": "Physics",
      "Subject": "Quantum Mechanics",
      "Discipline Description": "Natural and physical sciences",
      "Stream Description": "Study of matter and energy",
      "Subject Description": "Behavior of matter at atomic scale",
      "Display Order": 1,
      "Active": "Yes",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Discipline
    { wch: 22 }, // Stream
    { wch: 25 }, // Subject
    { wch: 40 }, // Discipline Description
    { wch: 40 }, // Stream Description
    { wch: 40 }, // Subject Description
    { wch: 12 }, // Display Order
    { wch: 8 },  // Active
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Academic Taxonomy");
  
  XLSX.writeFile(workbook, "academic_taxonomy_template.xlsx");
}

/**
 * Exports all current academic taxonomy data to Excel
 */
export async function exportAcademicData(): Promise<void> {
  // Fetch all disciplines
  const { data: disciplines, error: disciplinesError } = await supabase
    .from("academic_disciplines")
    .select("id, name, description")
    .order("display_order", { ascending: true, nullsFirst: false });

  if (disciplinesError) throw new Error(`Failed to fetch disciplines: ${disciplinesError.message}`);

  // Fetch all streams
  const { data: streams, error: streamsError } = await supabase
    .from("academic_streams")
    .select("id, name, description, discipline_id")
    .order("display_order", { ascending: true, nullsFirst: false });

  if (streamsError) throw new Error(`Failed to fetch streams: ${streamsError.message}`);

  // Fetch all subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from("academic_subjects")
    .select("id, name, description, display_order, is_active, stream_id")
    .order("display_order", { ascending: true, nullsFirst: false });

  if (subjectsError) throw new Error(`Failed to fetch subjects: ${subjectsError.message}`);

  // Build lookup maps
  const disciplineMap = new Map(disciplines?.map(d => [d.id, d]) || []);
  const streamMap = new Map(streams?.map(s => [s.id, { ...s, discipline: disciplineMap.get(s.discipline_id) }]) || []);

  // Build flat export data
  const exportData: AcademicTaxonomyExportRow[] = [];

  for (const subject of subjects || []) {
    const stream = streamMap.get(subject.stream_id);
    if (!stream || !stream.discipline) continue;

    exportData.push({
      "Discipline": stream.discipline.name,
      "Stream": stream.name,
      "Subject": subject.name,
      "Discipline Description": stream.discipline.description || "",
      "Stream Description": stream.description || "",
      "Subject Description": subject.description || "",
      "Display Order": subject.display_order || "",
      "Active": subject.is_active ? "Yes" : "No",
    });
  }

  if (exportData.length === 0) {
    throw new Error("No data to export. Please add some academic taxonomy data first.");
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Discipline
    { wch: 22 }, // Stream
    { wch: 25 }, // Subject
    { wch: 40 }, // Discipline Description
    { wch: 40 }, // Stream Description
    { wch: 40 }, // Subject Description
    { wch: 12 }, // Display Order
    { wch: 8 },  // Active
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Academic Taxonomy");
  
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `academic_taxonomy_export_${timestamp}.xlsx`);
}

/**
 * Parsed row structure for import
 */
export interface ParsedAcademicRow {
  discipline: string;
  stream: string;
  subject: string;
  disciplineDescription: string;
  streamDescription: string;
  subjectDescription: string;
  displayOrder: number | null;
  isActive: boolean;
  rowNumber: number;
  errors: string[];
}

export interface AcademicImportValidationResult {
  validRows: ParsedAcademicRow[];
  invalidRows: ParsedAcademicRow[];
  totalRows: number;
}

/**
 * Parse an imported Excel/CSV file and return validated rows
 */
export async function parseAcademicImportFile(file: File): Promise<AcademicImportValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        const validRows: ParsedAcademicRow[] = [];
        const invalidRows: ParsedAcademicRow[] = [];

        jsonData.forEach((row, index) => {
          const rowNumber = index + 2; // +2 for 1-indexed + header row
          const errors: string[] = [];

          // Normalize and extract values
          const discipline = normalizeText(row["Discipline"]);
          const stream = normalizeText(row["Stream"]);
          const subject = normalizeText(row["Subject"]);
          const disciplineDescription = normalizeText(row["Discipline Description"]);
          const streamDescription = normalizeText(row["Stream Description"]);
          const subjectDescription = normalizeText(row["Subject Description"]);
          const displayOrder = parseDisplayOrder(row["Display Order"]);
          const isActive = parseActive(row["Active"]);

          // Validation
          if (!discipline) {
            errors.push("Discipline is required");
          }

          if (!stream) {
            errors.push("Stream is required");
          }

          if (!subject) {
            errors.push("Subject is required");
          }

          const parsedRow: ParsedAcademicRow = {
            discipline,
            stream,
            subject,
            disciplineDescription,
            streamDescription,
            subjectDescription,
            displayOrder,
            isActive,
            rowNumber,
            errors,
          };

          if (errors.length > 0) {
            invalidRows.push(parsedRow);
          } else {
            validRows.push(parsedRow);
          }
        });

        resolve({
          validRows,
          invalidRows,
          totalRows: jsonData.length,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}

// Helper functions
function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

function parseDisplayOrder(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.floor(num);
}

function parseActive(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const strValue = String(value).toLowerCase().trim();
  return strValue !== "no" && strValue !== "false" && strValue !== "0";
}
