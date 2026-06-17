/**
 * Derives a short prefix from an institution name.
 * Sourced from src/utils/deriveInstitutionPrefix.ts for server-side usage.
 */
export function deriveInstitutionPrefix(name: string): string {
  if (!name || name.trim().length === 0) return 'SCH';

  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const skipWords = new Set(['and', 'of', 'the', 'in', 'at', 'for', 'a', 'an']);
  const significant = words.filter(w => !skipWords.has(w.toLowerCase()));

  const prefix = significant
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 4);

  return prefix.length >= 2 ? prefix : significant[0]?.slice(0, 3).toUpperCase() ?? 'SCH';
}
