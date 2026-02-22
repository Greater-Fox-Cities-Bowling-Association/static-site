// Generic CSV to collection item mapper driven by CollectionDef field schemas
import type { CollectionDef } from '../types/cms';

interface CSVRow {
  [key: string]: string;
}

/**
 * Maps an array of CSV rows to collection item objects using the field definitions
 * from a CollectionDef. Coerces values to the declared field type.
 */
export function mapCSVToCollection(rows: CSVRow[], def: CollectionDef): Record<string, unknown>[] {
  return rows.map(row => {
    const item: Record<string, unknown> = {};
    for (const field of def.fields) {
      // Accept column headers matching field.name or field.label (case-insensitive)
      const raw =
        row[field.name] ??
        row[field.label] ??
        row[field.name.toLowerCase()] ??
        row[field.label.toLowerCase()] ??
        '';

      switch (field.type) {
        case 'number':
          item[field.name] = parseFloat(raw) || 0;
          break;
        case 'boolean':
          item[field.name] = raw === 'true' || raw === '1' || raw.toLowerCase() === 'yes';
          break;
        case 'array':
          try {
            item[field.name] = JSON.parse(raw);
          } catch {
            item[field.name] = raw ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          }
          break;
        case 'object':
          try {
            item[field.name] = JSON.parse(raw);
          } catch {
            item[field.name] = {};
          }
          break;
        default:
          item[field.name] = raw;
      }
    }
    return item;
  });
}

/**
 * Detect the best-matching collection definition from a CSV filename.
 * Checks if the filename contains the collection id or name (case-insensitive).
 * Returns null if no match is found.
 */
export function detectCollectionFromFilename(
  filename: string,
  defs: CollectionDef[]
): CollectionDef | null {
  const normalized = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    defs.find(def => {
      const idNorm = def.id.replace(/-/g, '');
      const nameNorm = def.name.toLowerCase().replace(/\s+/g, '');
      return normalized.includes(idNorm) || normalized.includes(nameNorm);
    }) ?? null
  );
}
