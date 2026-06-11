/**
 * Derives a short prefix from an institution name.
 * Examples:
 *   "Gurukul Shikshalaya"               → "GS"
 *   "B.B.S. Smriti Vidyapeeth, Auraiya" → "BSV"
 *   "Delhi Public School"               → "DPS"
 *   "St. Mary's Convent"                → "SMC"
 */
export function deriveInstitutionPrefix(name: string): string {
  if (!name || name.trim().length === 0) return 'SCH';

  // Remove punctuation except spaces, then split into words
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')  // replace dots, commas, apostrophes with space
    .split(/\s+/)
    .filter(Boolean);

  // Skip common noise words
  const skipWords = new Set(['and', 'of', 'the', 'in', 'at', 'for', 'a', 'an']);

  const significant = words.filter(w => !skipWords.has(w.toLowerCase()));

  // Take first letter of each significant word, uppercase, max 4 chars
  const prefix = significant
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 4);

  return prefix.length >= 2 ? prefix : significant[0]?.slice(0, 3).toUpperCase() ?? 'SCH';
}
