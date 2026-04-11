/**
 * Per-section configuration for reference material uploads (files + URLs).
 * Controls which sections accept uploads, format limits, and sharing defaults.
 */

export interface SectionUploadCfg {
  enabled: boolean;
  maxFiles: number;
  maxUrls: number;
  acceptedFormats: string[];
  maxFileSizeMB: number;
  uploadPrompt: string;
  urlPrompt: string;
  sharingDefault: boolean;
  sharingRecommendation: 'recommended' | 'optional' | 'discouraged';
}

const DISABLED: SectionUploadCfg = {
  enabled: false, maxFiles: 0, maxUrls: 0, maxFileSizeMB: 0,
  acceptedFormats: [], uploadPrompt: '', urlPrompt: '',
  sharingDefault: false, sharingRecommendation: 'discouraged',
};

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const CSV = 'text/csv';
const PNG = 'image/png';
const JPG = 'image/jpeg';
const WEBP = 'image/webp';

const DOC_IMG = [PDF, DOCX, PPTX, PNG, JPG, WEBP];
const DOC_ONLY = [PDF, DOCX];
const DATA_IMG = [PDF, XLSX, CSV, PNG, JPG, WEBP];

export const SECTION_UPLOAD_CONFIG: Record<string, SectionUploadCfg> = {
  // ── Tier 1: High Value ──
  problem_statement: {
    enabled: true, maxFiles: 3, maxUrls: 3, maxFileSizeMB: 25,
    acceptedFormats: DOC_IMG,
    uploadPrompt: 'Upload RFP, business case, executive brief, or process flow diagram',
    urlPrompt: 'Add link to company page, industry report, or prior challenge',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  context_and_background: {
    enabled: true, maxFiles: 3, maxUrls: 3, maxFileSizeMB: 25,
    acceptedFormats: DOC_IMG,
    uploadPrompt: 'Upload company overview, org chart, or operational flow diagram',
    urlPrompt: 'Add link to company about page, Wikipedia, or industry overview',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  deliverables: {
    enabled: true, maxFiles: 3, maxUrls: 2, maxFileSizeMB: 25,
    acceptedFormats: [PDF, DOCX, XLSX, PNG, JPG, WEBP],
    uploadPrompt: 'Upload technical spec, SOW, architecture diagram, or requirements doc',
    urlPrompt: 'Add link to API docs, GitHub repo, or technical reference',
    sharingDefault: false, sharingRecommendation: 'recommended',
  },
  data_resources_provided: {
    enabled: true, maxFiles: 5, maxUrls: 3, maxFileSizeMB: 10,
    acceptedFormats: DATA_IMG,
    uploadPrompt: 'Upload data dictionary, sample dataset, API docs, or ERD',
    urlPrompt: 'Add link to API endpoint docs, data portal, or schema reference',
    sharingDefault: false, sharingRecommendation: 'recommended',
  },
  evaluation_criteria: {
    enabled: true, maxFiles: 2, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: [PDF, DOCX, XLSX],
    uploadPrompt: 'Upload evaluation rubric, scoring methodology, or criteria template',
    urlPrompt: 'Add link to evaluation framework or scoring standards',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  scope: {
    enabled: true, maxFiles: 2, maxUrls: 2, maxFileSizeMB: 25,
    acceptedFormats: [PDF, DOCX, PNG, JPG, WEBP],
    uploadPrompt: 'Upload scope document or boundary diagram',
    urlPrompt: 'Add link to project wiki, system docs, or boundary reference',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  success_metrics_kpis: {
    enabled: true, maxFiles: 2, maxUrls: 2, maxFileSizeMB: 10,
    acceptedFormats: [PDF, XLSX, DOCX, PNG],
    uploadPrompt: 'Upload KPI dashboard, baseline report, or benchmark data',
    urlPrompt: 'Add link to industry benchmarks or performance standards',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  affected_stakeholders: {
    enabled: true, maxFiles: 2, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: DOC_IMG,
    uploadPrompt: 'Upload org chart, RACI matrix, or stakeholder map',
    urlPrompt: 'Add link to team page or org structure',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  // ── Tier 2: Medium Value ──
  expected_outcomes: {
    enabled: true, maxFiles: 2, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: DOC_ONLY,
    uploadPrompt: 'Upload business case, ROI projections, or strategic plan excerpt',
    urlPrompt: 'Add link to strategic plan or business objectives page',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  phase_schedule: {
    enabled: true, maxFiles: 2, maxUrls: 1, maxFileSizeMB: 10,
    acceptedFormats: [PDF, XLSX, PNG, JPG, WEBP],
    uploadPrompt: 'Upload project timeline, Gantt chart, or phasing plan',
    urlPrompt: 'Add link to project board or timeline tool',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  reward_structure: {
    enabled: true, maxFiles: 1, maxUrls: 1, maxFileSizeMB: 10,
    acceptedFormats: [PDF, XLSX, DOCX],
    uploadPrompt: 'Upload budget approval or prior reward benchmarks',
    urlPrompt: 'Add link to similar challenge reward references',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  solver_expertise: {
    enabled: true, maxFiles: 2, maxUrls: 2, maxFileSizeMB: 25,
    acceptedFormats: DOC_ONLY,
    uploadPrompt: 'Upload job description, skills matrix, or team requirements',
    urlPrompt: 'Add link to certification body, technology docs, or skills framework',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  submission_guidelines: {
    enabled: true, maxFiles: 2, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: DOC_ONLY,
    uploadPrompt: 'Upload submission template or format guide',
    urlPrompt: 'Add link to submission examples or template repository',
    sharingDefault: false, sharingRecommendation: 'recommended',
  },
  ip_model: {
    enabled: true, maxFiles: 1, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: DOC_ONLY,
    uploadPrompt: 'Upload IP policy or standard terms document',
    urlPrompt: 'Add link to standard IP terms or licensing page',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  current_deficiencies: {
    enabled: true, maxFiles: 2, maxUrls: 1, maxFileSizeMB: 10,
    acceptedFormats: DATA_IMG,
    uploadPrompt: 'Upload audit report, gap analysis, or defect data',
    urlPrompt: 'Add link to assessment framework or industry baseline',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  root_causes: {
    enabled: true, maxFiles: 2, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: [PDF, DOCX, PNG, JPG, WEBP],
    uploadPrompt: 'Upload root cause analysis or fishbone diagram',
    urlPrompt: 'Add link to analysis methodology or prior assessment',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  // ── Tier 3: Low Value (2 enabled) ──
  preferred_approach: {
    enabled: true, maxFiles: 1, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: DOC_ONLY,
    uploadPrompt: 'Upload strategy document (AI reads but preserves your intent)',
    urlPrompt: 'Add link to methodology or technology reference',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  approaches_not_of_interest: {
    enabled: true, maxFiles: 1, maxUrls: 1, maxFileSizeMB: 25,
    acceptedFormats: DOC_ONLY,
    uploadPrompt: 'Upload lessons learned or failed approaches document',
    urlPrompt: 'Add link to prior assessment or rejected approach write-up',
    sharingDefault: false, sharingRecommendation: 'discouraged',
  },
  creator_references: {
    enabled: true, maxFiles: 5, maxUrls: 3, maxFileSizeMB: 25,
    acceptedFormats: DOC_IMG,
    uploadPrompt: 'Upload reference documents, research papers, or supporting materials',
    urlPrompt: 'Add link to external reference or resource',
    sharingDefault: false, sharingRecommendation: 'optional',
  },
  // ── Disabled (9 sections) ──
  hook: DISABLED,
  domain_tags: DISABLED,
  visibility: DISABLED,
  eligibility: DISABLED,
  solution_type: DISABLED,
  maturity_level: DISABLED,
  complexity: DISABLED,
  legal_docs: DISABLED,
  escrow_funding: DISABLED,
};

/**
 * Context-sensitive sharing guidance shown when curator toggles solver sharing.
 */
export const SHARING_GUIDANCE: Partial<Record<string, string>> = {
  problem_statement: 'Share if this is the original RFP or challenge brief. Do NOT share internal memos or confidential assessments.',
  context_and_background: 'Share company overviews or operational descriptions. Do NOT share confidential org charts or internal restructuring plans.',
  deliverables: 'Share technical specs, architecture diagrams, and requirements docs. Highly recommended — helps solvers understand exactly what you need.',
  data_resources_provided: 'Share data dictionaries, sample datasets, API docs, and ERDs. Highly recommended — solvers NEED these to build solutions.',
  evaluation_criteria: 'Usually not needed. Share only if you have a detailed scoring rubric beyond the section text.',
  scope: 'Share scope documents or boundary diagrams for extra detail beyond the section text.',
  success_metrics_kpis: 'Share benchmark data if it helps solvers understand success. Remove confidential business metrics.',
  affected_stakeholders: 'Usually not needed. Share only sanitized stakeholder maps for adoption context.',
  submission_guidelines: 'Share submission templates and format guides. Highly recommended — solvers need clear submission instructions.',
  ip_model: 'Share standard IP terms or policy if it provides more detail than the section summary.',
  current_deficiencies: 'Share anonymized audit data or gap analyses. Remove employee names and internal system details.',
  reward_structure: 'Do NOT share. Internal budget documents should stay private.',
  preferred_approach: 'Do NOT share. Strategic preferences are for AI context only.',
  approaches_not_of_interest: 'Do NOT share. Internal lessons learned are for AI context only.',
  expected_outcomes: 'Rarely needed. Share only if ROI projections help solvers scope proposals.',
  phase_schedule: 'Rarely needed. Timeline details are in the section itself.',
  solver_expertise: 'Rarely needed. Expertise requirements are in the section itself.',
  root_causes: 'Rarely needed. Root cause details are in the section itself.',
  creator_references: 'Share reference documents that help solvers understand the challenge context. Remove confidential internal materials.',
};
