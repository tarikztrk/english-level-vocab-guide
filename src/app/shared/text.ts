/**
 * Folds the four Turkish i-letters onto a single "i" before lowercasing.
 * Plain toLowerCase() turns "İ" into "i̇" (i + combining dot), so a search for
 * "inatçı" would never match the meaning "İnatçı"; toLocaleLowerCase('tr') fixes
 * that but breaks English words ("Inherent" becomes "ınherent"). Searching a
 * bilingual list has to be forgiving in both directions.
 */
export function normalizeForSearch(value: string): string {
  return value.replace(/[İIı]/g, 'i').toLowerCase();
}
