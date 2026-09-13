/** CEFR levels in curriculum order, with the Turkish descriptors the UI shows. */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const LEVEL_NAMES: Record<string, string> = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Üst orta',
  C1: 'İleri',
  C2: 'Yetkin'
};

/** "B1 · Orta" — the heading form used by the list, the deck and the home screen. */
export function levelTitle(level: string): string {
  const name = LEVEL_NAMES[level];
  return name ? `${level} · ${name}` : level;
}
