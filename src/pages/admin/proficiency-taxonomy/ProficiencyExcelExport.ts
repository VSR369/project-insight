// XLSX dynamically imported at point-of-use to reduce initial bundle
import { supabase } from "@/integrations/supabase/client";

export interface TaxonomyExportRow {
  "Industry Segment": string;
  "Expertise Level": string;
  "Proficiency Area": string;
  "Sub-Domain": string;
  "Speciality": string;
  "Area Description": string;
  "Sub-Domain Description": string;
  "Speciality Description": string;
  "Display Order": number | string;
  "Active": string;
}

/**
 * Downloads an empty template Excel file with headers and sample rows
 */
export async function downloadProficiencyTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const templateData: TaxonomyExportRow[] = [
    {
      "Industry Segment": "Manufacturing",
      "Expertise Level": "Associate Consultant",
      "Proficiency Area": "Data Analytics",
      "Sub-Domain": "Business Intelligence",
      "Speciality": "Power BI Development",
      "Area Description": "Analytics and insights capabilities",
      "Sub-Domain Description": "BI tools and reporting",
      "Speciality Description": "Creating dashboards and reports in Power BI",
      "Display Order": 1,
      "Active": "Yes",
    },
    {
      "Industry Segment": "Manufacturing",
      "Expertise Level": "Associate Consultant",
      "Proficiency Area": "Data Analytics",
      "Sub-Domain": "Business Intelligence",
      "Speciality": "Tableau Visualization",
      "Area Description": "Analytics and insights capabilities",
      "Sub-Domain Description": "BI tools and reporting",
      "Speciality Description": "Building data visualizations in Tableau",
      "Display Order": 2,
      "Active": "Yes",
    },
    {
      "Industry Segment": "Manufacturing",
      "Expertise Level": "Partner",
      "Proficiency Area": "Executive Strategy",
      "Sub-Domain": "M&A Advisory",
      "Speciality": "Due Diligence",
      "Area Description": "C-level strategic advisory",
      "Sub-Domain Description": "Mergers and acquisitions support",
      "Speciality Description": "Conducting strategic due diligence",
      "Display Order": 1,
      "Active": "Yes",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Industry Segment
    { wch: 22 }, // Expertise Level
    { wch: 25 }, // Proficiency Area
    { wch: 25 }, // Sub-Domain
    { wch: 30 }, // Speciality
    { wch: 40 }, // Area Description
    { wch: 40 }, // Sub-Domain Description
    { wch: 40 }, // Speciality Description
    { wch: 12 }, // Display Order
    { wch: 8 },  // Active
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Proficiency Taxonomy");
  
  XLSX.writeFile(workbook, "proficiency_taxonomy_template.xlsx");
}

/**
 * Exports all current proficiency taxonomy data to Excel
 */
export async function exportProficiencyData(): Promise<void> {
  const XLSX = await import("xlsx");
  // Fetch all data with relationships
  const { data: industrySegments, error: segmentsError } = await supabase
    .from("industry_segments")
    .select("id, name")
    .eq("is_active", true)
    .order("display_order", { ascending: true, nullsFirst: false });

  if (segmentsError) throw new Error(`Failed to fetch industry segments: ${segmentsError.message}`);

  const { data: expertiseLevels, error: levelsError } = await supabase
    .from("expertise_levels")
    .select("id, name")
    .eq("is_active", true)
    .order("level_number", { ascending: true });

  if (levelsError) throw new Error(`Failed to fetch expertise levels: ${levelsError.message}`);

  const { data: proficiencyAreas, error: areasError } = await supabase
    .from("proficiency_areas")
    .select("id, name, description, display_order, is_active, industry_segment_id, expertise_level_id")
    .order("display_order", { ascending: true, nullsFirst: false });

  if (areasError) throw new Error(`Failed to fetch proficiency areas: ${areasError.message}`);

  const { data: subDomains, error: subDomainsError } = await supabase
    .from("sub_domains")
    .select("id, name, description, display_order, is_active, proficiency_area_id")
    .order("display_order", { ascending: true, nullsFirst: false });

  if (subDomainsError) throw new Error(`Failed to fetch sub-domains: ${subDomainsError.message}`);

  const { data: specialities, error: specialitiesError } = await supabase
    .from("specialities")
    .select("id, name, description, display_order, is_active, sub_domain_id")
    .order("display_order", { ascending: true, nullsFirst: false });

  if (specialitiesError) throw new Error(`Failed to fetch specialities: ${specialitiesError.message}`);

  // Build lookup maps
  const segmentMap = new Map(industrySegments?.map(s => [s.id, s.name]) || []);
  const levelMap = new Map(expertiseLevels?.map(l => [l.id, l.name]) || []);
  const areaMap = new Map(proficiencyAreas?.map(a => [a.id, { 
    ...a, 
    segmentName: segmentMap.get(a.industry_segment_id),
    levelName: levelMap.get(a.expertise_level_id)
  }]) || []);
  const subDomainMap = new Map(subDomains?.map(sd => [sd.id, { ...sd, area: areaMap.get(sd.proficiency_area_id) }]) || []);

  // Build flat export data
  const exportData: TaxonomyExportRow[] = [];

  for (const speciality of specialities || []) {
    const subDomain = subDomainMap.get(speciality.sub_domain_id);
    if (!subDomain || !subDomain.area) continue;

    exportData.push({
      "Industry Segment": subDomain.area.segmentName || "",
      "Expertise Level": subDomain.area.levelName || "",
      "Proficiency Area": subDomain.area.name,
      "Sub-Domain": subDomain.name,
      "Speciality": speciality.name,
      "Area Description": subDomain.area.description || "",
      "Sub-Domain Description": subDomain.description || "",
      "Speciality Description": speciality.description || "",
      "Display Order": speciality.display_order || "",
      "Active": speciality.is_active ? "Yes" : "No",
    });
  }

  if (exportData.length === 0) {
    throw new Error("No data to export. Please add some proficiency taxonomy data first.");
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Industry Segment
    { wch: 22 }, // Expertise Level
    { wch: 25 }, // Proficiency Area
    { wch: 25 }, // Sub-Domain
    { wch: 30 }, // Speciality
    { wch: 40 }, // Area Description
    { wch: 40 }, // Sub-Domain Description
    { wch: 40 }, // Speciality Description
    { wch: 12 }, // Display Order
    { wch: 8 },  // Active
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Proficiency Taxonomy");
  
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `proficiency_taxonomy_export_${timestamp}.xlsx`);
}

/**
 * Parse an imported Excel/CSV file and return validated rows
 */
export interface ParsedTaxonomyRow {
  industrySegment: string;
  expertiseLevel: string;
  proficiencyArea: string;
  subDomain: string;
  speciality: string;
  areaDescription: string;
  subDomainDescription: string;
  specialityDescription: string;
  displayOrder: number | null;
  isActive: boolean;
  rowNumber: number;
  errors: string[];
}

export interface ImportValidationResult {
  validRows: ParsedTaxonomyRow[];
  invalidRows: ParsedTaxonomyRow[];
  totalRows: number;
}

export async function parseProficiencyImportFile(file: File): Promise<ImportValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        // Fetch existing industry segments for validation
        const { data: existingSegments, error: segmentsError } = await supabase
          .from("industry_segments")
          .select("id, name")
          .eq("is_active", true);

        if (segmentsError) {
          reject(new Error(`Failed to fetch industry segments: ${segmentsError.message}`));
          return;
        }

        // Fetch existing expertise levels for validation
        const { data: existingLevels, error: levelsError } = await supabase
          .from("expertise_levels")
          .select("id, name")
          .eq("is_active", true);

        if (levelsError) {
          reject(new Error(`Failed to fetch expertise levels: ${levelsError.message}`));
          return;
        }

        const segmentNameMap = new Map(
          (existingSegments || []).map(s => [s.name.toLowerCase().trim(), s.id])
        );

        const levelNameMap = new Map(
          (existingLevels || []).map(l => [l.name.toLowerCase().trim(), l.id])
        );

        const validRows: ParsedTaxonomyRow[] = [];
        const invalidRows: ParsedTaxonomyRow[] = [];

        jsonData.forEach((row, index) => {
          const rowNumber = index + 2; // +2 for 1-indexed + header row
          const errors: string[] = [];

          // Normalize and extract values - Industry Segment first, then Expertise Level
          const industrySegment = normalizeText(row["Industry Segment"]);
          const expertiseLevel = normalizeText(row["Expertise Level"]);
          const proficiencyArea = normalizeText(row["Proficiency Area"]);
          const subDomain = normalizeText(row["Sub-Domain"]);
          const speciality = normalizeText(row["Speciality"]);
          const areaDescription = normalizeText(row["Area Description"]);
          const subDomainDescription = normalizeText(row["Sub-Domain Description"]);
          const specialityDescription = normalizeText(row["Speciality Description"]);
          const displayOrder = parseDisplayOrder(row["Display Order"]);
          const isActive = parseActive(row["Active"]);

          // Validation - Industry Segment first, then Expertise Level
          if (!industrySegment) {
            errors.push("Industry Segment is required");
          } else if (!segmentNameMap.has(industrySegment.toLowerCase())) {
            errors.push(`Industry Segment "${industrySegment}" does not exist`);
          }

          if (!expertiseLevel) {
            errors.push("Expertise Level is required");
          } else if (!levelNameMap.has(expertiseLevel.toLowerCase())) {
            errors.push(`Expertise Level "${expertiseLevel}" does not exist`);
          }

          if (!proficiencyArea) {
            errors.push("Proficiency Area is required");
          }

          if (!subDomain) {
            errors.push("Sub-Domain is required");
          }

          if (!speciality) {
            errors.push("Speciality is required");
          }

          const parsedRow: ParsedTaxonomyRow = {
            industrySegment,
            expertiseLevel,
            proficiencyArea,
            subDomain,
            speciality,
            areaDescription,
            subDomainDescription,
            specialityDescription,
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
