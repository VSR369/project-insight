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
