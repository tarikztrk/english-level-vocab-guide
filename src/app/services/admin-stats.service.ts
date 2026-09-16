import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface LevelBreakdown {
  level: string;
  count: number;
  percent: number;
}

export interface DailyActivePoint {
  date: string;
  count: number;
}

export interface StudentRow {
  userId: string;
  email: string;
  learnedCount: number;
  masteryPercent: number;
  /** Last time this student touched any word; null when they never have. */
  lastActiveAt: string | null;
  /** Whole days between that last touch and today, so 0 means "active today". */
  daysSinceActive: number | null;
  joinedAt: string | null;
}

export interface SignupPoint {
  weekStart: string;
  count: number;
}

export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  totalWords: number;
  avgMasteryRate: number;
  learnedWordsTotal: number;
  missingExamplesCount: number;
  missingAudioCount: number;
  levelDistribution: LevelBreakdown[];
  dailyActive: DailyActivePoint[];
  students: StudentRow[];
  signups: SignupPoint[];
}

interface WordRow {
  id: number;
  level: string | null;
  example: string | null;
  audio_url: string | null;
}

interface ProfileRow {
  id: string;
  email: string | null;
  created_at: string | null;
}

interface ProgressRow {
  user_id: string;
  learned: boolean | null;
  updated_at: string | null;
}

/** Monday of the week the date falls in, at local midnight. */
function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const weekday = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - weekday);
  return start;
}

/**
 * Day key in the viewer's own timezone. toISOString() would convert local midnight
 * to UTC first, which in UTC+3 lands on the previous day: the buckets came out
 * shifted a day back and today's activity fell outside them entirely.
 */
function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  constructor(private supabaseService: SupabaseService) {}

  async getStats(): Promise<AdminStats> {
    const [{ data: words, error: wordsError }, { data: profiles, error: profilesError }, { data: progress, error: progressError }] =
      await Promise.all([
        this.supabaseService.client.from('words').select('id, level, example, audio_url').eq('status', 'published'),
        this.supabaseService.client.from('profiles').select('id, email, created_at'),
        this.supabaseService.client.from('user_progress').select('user_id, learned, updated_at')
      ]);

    if (wordsError) throw wordsError;
    if (profilesError) throw profilesError;
    if (progressError) throw progressError;

    const wordRows = (words ?? []) as WordRow[];
    const profileRows = (profiles ?? []) as ProfileRow[];
    const progressRows = (progress ?? []) as ProgressRow[];

    const totalWords = wordRows.length;
    const totalUsers = profileRows.length;
    const emailByUserId = new Map(profileRows.map((p) => [p.id, p.email ?? 'Bilinmeyen kullanıcı']));

    const learnedRows = progressRows.filter((row) => row.learned);
    const learnedCountByUser = new Map<string, number>();
    for (const row of learnedRows) {
      learnedCountByUser.set(row.user_id, (learnedCountByUser.get(row.user_id) ?? 0) + 1);
    }

    const learnersWithProgress = Array.from(learnedCountByUser.entries());
    const avgMasteryRate =
      totalWords > 0 && learnersWithProgress.length > 0
        ? Math.round(
            (learnersWithProgress.reduce((sum, [, count]) => sum + count / totalWords, 0) / learnersWithProgress.length) * 100
          )
        : 0;

    // Last touch per user, so the table can show who has gone quiet. Rows are keyed
    // by (user, word) and updated in place, so this is a last-seen date, not a visit count.
    const lastActiveByUser = new Map<string, number>();
    for (const row of progressRows) {
      if (!row.updated_at) continue;
      const seenAt = new Date(row.updated_at).getTime();
      const previous = lastActiveByUser.get(row.user_id);
      if (previous === undefined || seenAt > previous) {
        lastActiveByUser.set(row.user_id, seenAt);
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Every registered student appears, including those with no progress at all —
    // those are exactly the ones worth noticing.
    const students: StudentRow[] = profileRows
      .map((profile) => {
        const learnedCount = learnedCountByUser.get(profile.id) ?? 0;
        const lastActive = lastActiveByUser.get(profile.id);
        let daysSinceActive: number | null = null;

        if (lastActive !== undefined) {
          const lastActiveDay = new Date(lastActive);
          lastActiveDay.setHours(0, 0, 0, 0);
          daysSinceActive = Math.round((startOfToday.getTime() - lastActiveDay.getTime()) / 86400000);
        }

        return {
          userId: profile.id,
          email: profile.email ?? 'Bilinmeyen kullanıcı',
          learnedCount,
          masteryPercent: totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0,
          lastActiveAt: lastActive !== undefined ? new Date(lastActive).toISOString() : null,
          daysSinceActive,
          joinedAt: profile.created_at
        };
      })
      .sort((a, b) => b.learnedCount - a.learnedCount);

    const activeToday = new Set(
      progressRows.filter((row) => row.updated_at && new Date(row.updated_at) >= startOfToday).map((row) => row.user_id)
    ).size;

    const levelCounts = new Map<string, number>();
    let missingExamplesCount = 0;
    let missingAudioCount = 0;
    for (const word of wordRows) {
      const level = (word.level || 'Belirtilmemiş').toUpperCase();
      levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
      if (!word.example) missingExamplesCount++;
      if (!word.audio_url) missingAudioCount++;
    }

    const levelDistribution: LevelBreakdown[] = Array.from(levelCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([level, count]) => ({
        level,
        count,
        percent: totalWords > 0 ? Math.round((count / totalWords) * 100) : 0
      }));

    return {
      totalUsers,
      activeToday,
      totalWords,
      avgMasteryRate,
      learnedWordsTotal: learnedRows.length,
      missingExamplesCount,
      missingAudioCount,
      levelDistribution,
      dailyActive: this.buildDailyActive(progressRows),
      students,
      signups: this.buildSignups(profileRows)
    };
  }

  /** Registrations per week for the last 8 weeks, bucketed on Monday in local time. */
  private buildSignups(profileRows: ProfileRow[]): SignupPoint[] {
    const countsByWeek = new Map<string, number>();

    for (let i = 7; i >= 0; i--) {
      const week = startOfWeek(new Date());
      week.setDate(week.getDate() - i * 7);
      countsByWeek.set(localDayKey(week), 0);
    }

    for (const profile of profileRows) {
      if (!profile.created_at) continue;
      const key = localDayKey(startOfWeek(new Date(profile.created_at)));
      const current = countsByWeek.get(key);
      if (current !== undefined) {
        countsByWeek.set(key, current + 1);
      }
    }

    return Array.from(countsByWeek.entries()).map(([weekStart, count]) => ({ weekStart, count }));
  }

  private buildDailyActive(progressRows: ProgressRow[]): DailyActivePoint[] {
    const usersByDay = new Map<string, Set<string>>();

    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      usersByDay.set(localDayKey(day), new Set());
    }

    for (const row of progressRows) {
      if (!row.updated_at) continue;
      const key = localDayKey(new Date(row.updated_at));
      usersByDay.get(key)?.add(row.user_id);
    }

    return Array.from(usersByDay.entries()).map(([date, users]) => ({ date, count: users.size }));
  }
}
