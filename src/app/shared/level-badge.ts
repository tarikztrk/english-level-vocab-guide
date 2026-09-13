/**
 * Single-hue CEFR ramp: the badge darkens as the level advances, so level order
 * reads from colour alone instead of six unrelated hues. Every contrast pair
 * here clears 4.5:1. Shared by the list, the dashboard and the admin table so
 * the same level never renders two different ways.
 */
const LEVEL_BADGE_STYLES: Record<string, { background: string; color: string }> = {
  A1: { background: '#EEF3FE', color: '#0A2668' },
  A2: { background: '#C7D9FC', color: '#0A2668' },
  B1: { background: '#1A56DB', color: '#FFFFFF' },
  B2: { background: '#1345A8', color: '#FFFFFF' },
  C1: { background: '#103B9E', color: '#FFFFFF' },
  C2: { background: '#0A2668', color: '#FFFFFF' }
};

const UNKNOWN_LEVEL_STYLE = { background: '#F0F2F8', color: '#4A5566' };

export function levelBadgeStyle(level: string): { background: string; color: string } {
  return LEVEL_BADGE_STYLES[level] ?? UNKNOWN_LEVEL_STYLE;
}
