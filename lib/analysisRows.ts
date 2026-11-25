import type { ScoreDimensions } from './platform.types';

type Row = Record<string, unknown>;

function asObject(value: unknown): Row | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : null;
}

/**
 * `analysis_results` schemas differ across environments: some have a
 * `radar_scores` jsonb column, others only the flat accuracy/technical/soft/
 * management ints, and a few legacy dumps nest scores under result_data or
 * analysis_data. Reads always use `.select('*')`, so probe every known shape.
 */
export function radarScoresFromRow(row: Row): Partial<ScoreDimensions> | null {
  const direct = asObject(row.radar_scores) ?? asObject(row.scores);
  if (direct) return direct as Partial<ScoreDimensions>;
  for (const key of ['result_data', 'analysis_data', 'result', 'analysis']) {
    const nested = asObject(asObject(row[key])?.radar_scores);
    if (nested) return nested as Partial<ScoreDimensions>;
  }
  return null;
}

export function rowString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function rowStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function rowNumber(value: unknown, fallback: number): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}
