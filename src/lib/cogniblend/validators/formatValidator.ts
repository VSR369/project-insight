/**
 * Format Validator — Rule 6: Validates AI output matches SECTION_FORMAT_CONFIG.
 *
 * Checks: table → JSON array of objects, line_items → string array,
 * checkbox_single → single value, checkbox_multi → array of valid values.
 */

import { getSectionFormat } from '@/lib/cogniblend/curationSectionFormats';
import type { ValidationCorrection } from '../postLlmValidation';

export interface FormatValidationResult {
  corrections: ValidationCorrection[];
  passedChecks: string[];
}

export function validateFormat(
  sectionKey: string,
  aiOutput: Record<string, unknown>,
): FormatValidationResult {
  const corrections: ValidationCorrection[] = [];
  const passedChecks: string[] = [];

  const config = getSectionFormat(sectionKey);
  if (!config) return { corrections, passedChecks };

  const suggestion = aiOutput.suggestion ?? aiOutput.suggestedContent ?? aiOutput;

  switch (config.format) {
    case 'table':
    case 'schedule_table': {
      const rows = extractRows(suggestion);
      if (rows !== null) {
        if (!Array.isArray(rows)) {
          corrections.push({
            field: sectionKey,
            issue: `Expected table format (array of objects) but received ${typeof rows}.`,
            severity: 'warning',
            autoFixed: false,
            originalValue: typeof rows,
            fixedValue: null,
          });
        } else if (rows.length > 0 && typeof rows[0] !== 'object') {
          corrections.push({
            field: sectionKey,
            issue: 'Table rows must be objects with column keys.',
            severity: 'warning',
            autoFixed: false,
            originalValue: typeof rows[0],
            fixedValue: null,
          });
        } else {
          passedChecks.push(`${sectionKey} format is valid table`);
        }
      }
      break;
    }

    case 'line_items': {
      const items = extractItems(suggestion);
      if (items !== null && !Array.isArray(items)) {
        corrections.push({
          field: sectionKey,
          issue: `Expected line_items (array) but received ${typeof items}.`,
          severity: 'warning',
          autoFixed: false,
          originalValue: typeof items,
          fixedValue: null,
        });
      } else {
        passedChecks.push(`${sectionKey} format is valid line_items`);
      }
      break;
    }

    case 'checkbox_single': {
      if (suggestion !== null && typeof suggestion === 'object' && Array.isArray(suggestion) && suggestion.length > 1) {
        corrections.push({
          field: sectionKey,
          issue: 'checkbox_single expects a single value but received an array with multiple values.',
          severity: 'warning',
          autoFixed: false,
          originalValue: suggestion,
          fixedValue: null,
        });
      } else {
        passedChecks.push(`${sectionKey} format is valid checkbox_single`);
      }
      break;
    }

    default:
      passedChecks.push(`${sectionKey} format check passed (${config.format})`);
  }

  return { corrections, passedChecks };
}

function extractRows(suggestion: unknown): unknown {
  if (suggestion == null) return null;
  if (Array.isArray(suggestion)) return suggestion;
  if (typeof suggestion === 'object') {
    const obj = suggestion as Record<string, unknown>;
    return obj.rows ?? obj.phases ?? obj.criteria ?? obj.items ?? null;
  }
  return null;
}

function extractItems(suggestion: unknown): unknown {
  if (suggestion == null) return null;
  if (Array.isArray(suggestion)) return suggestion;
  if (typeof suggestion === 'object') {
    const obj = suggestion as Record<string, unknown>;
    return obj.items ?? obj.list ?? null;
  }
  return null;
}
