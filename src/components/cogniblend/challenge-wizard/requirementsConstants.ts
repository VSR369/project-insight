/**
 * requirementsConstants — Constants for StepRequirements.
 * Extracted from StepRequirements.tsx.
 */

export const ARTIFACT_TIERS: Record<string, string[]> = {
  blueprint: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram'],
  poc: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram', 'Data/Evidence', 'Video Demo'],
  prototype: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo',
    'Source Code', 'Hardware Specs', 'API Documentation',
  ],
  pilot: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo',
    'Source Code', 'Hardware Specs', 'API Documentation',
    'Field Data', 'Deployment Guide', 'Metrics Report',
  ],
};

export const IP_OPTIONS = [
  {
    value: 'IP-EA',
    label: 'Exclusive Assignment',
    short: 'You acquire full IP ownership',
    tooltip: 'The solver transfers all intellectual property rights to you upon acceptance. They may not use, license, or sell the solution to anyone else.',
  },
  {
    value: 'IP-NEL',
    label: 'Non-Exclusive License',
    short: 'Solver keeps IP, you get license',
    tooltip: 'The solver retains ownership but grants you a perpetual, non-exclusive license to use the solution. The solver may license it to others.',
  },
  {
    value: 'IP-EL',
    label: 'Exclusive License',
    short: 'Solver keeps IP, exclusive use for you',
    tooltip: 'The solver retains ownership but grants you an exclusive license. No other party (including the solver) may use or license the solution.',
  },
  {
    value: 'IP-JO',
    label: 'Joint Ownership',
    short: 'Both parties co-own',
    tooltip: 'Both you and the solver share ownership of the intellectual property. Either party may use or license it, subject to the agreement terms.',
  },
  {
    value: 'IP-NONE',
    label: 'No Transfer',
    short: 'Advisory only',
    tooltip: 'No intellectual property transfer occurs. The engagement is advisory in nature — the solver provides guidance, recommendations, or consulting only.',
  },
] as const;

export const MATURITY_IP_DEFAULTS: Record<string, string> = {
  blueprint: 'IP-NEL',
  poc: 'IP-NEL',
  prototype: 'IP-EA',
  pilot: 'IP-EA',
};
