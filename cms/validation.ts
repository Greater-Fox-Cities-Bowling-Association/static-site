/**
 * validation.ts
 * Schema-driven validation for CMS entries.
 */

import type { CmsSchema, CmsEntry } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates a CMS entry against its schema.
 * Returns an array of validation errors (empty means valid).
 */
export function validateEntry(schema: CmsSchema, value: CmsEntry): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of schema.fields) {
    const raw = value[field.name];

    // Required check
    if (field.required) {
      if (
        raw === undefined ||
        raw === null ||
        (typeof raw === 'string' && raw.trim() === '') ||
        (Array.isArray(raw) && raw.length === 0)
      ) {
        errors.push({ field: field.name, message: `${field.label} is required.` });
        continue;
      }
    }

    if (raw === undefined || raw === null || raw === '') continue;

    // Type-specific checks
    switch (field.type) {
      case 'number': {
        const n = Number(raw);
        if (isNaN(n)) {
          errors.push({ field: field.name, message: `${field.label} must be a number.` });
        }
        break;
      }
      case 'slug': {
        if (typeof raw === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) {
          errors.push({
            field: field.name,
            message: `${field.label} must only contain lowercase letters, numbers, and hyphens.`,
          });
        }
        break;
      }
      case 'textarea': {
        if (field.maxLength && typeof raw === 'string' && raw.length > field.maxLength) {
          errors.push({
            field: field.name,
            message: `${field.label} must be ${field.maxLength} characters or fewer (currently ${raw.length}).`,
          });
        }
        break;
      }
    }
  }

  return errors;
}

/**
 * Returns a map of field name → first error message for easy form binding.
 */
export function validationErrorMap(
  errors: ValidationError[]
): Record<string, string> {
  return Object.fromEntries(errors.map((e) => [e.field, e.message]));
}
