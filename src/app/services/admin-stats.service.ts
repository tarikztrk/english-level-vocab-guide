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

export interface TopLearner {
  email: string;
  learnedCount: number;
  masteryPercent: number;
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
  topLearners: TopLearner[];
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
}

interface ProgressRow {
  user_id: string;
  learned: boolean | null;
  updated_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  constructor(private supabaseService: SupabaseService) {}

  async getStats(): Promise<AdminStats> {
    const [{ data: words, error: wordsError }, { data: profiles, error: profilesError }, { data: progress, error: progressError }] =
      await Promise.all([
        this.supabaseService.client.from('words').select('id, level, example, audio_url'),
        this.supabaseService.client.from('profiles').select('id, email'),
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
    const emailByUserId = new Map(profileRows.map((p) => [p.id, p.email ?? 'Unknown user']));

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

    const topLearners: TopLearner[] = learnersWithProgress
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        email: emailByUserId.get(userId) ?? 'Unknown user',
        learnedCount: count,
        masteryPercent: totalWords > 0 ? Math.round((count / totalWords) * 100) : 0
      }));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activeToday = new Set(
      progressRows.filter((row) => row.updated_at && new Date(row.updated_at) >= startOfToday).map((row) => row.user_id)
    ).size;

    const levelCounts = new Map<string, number>();
    let missingExamplesCount = 0;
    let missingAudioCount = 0;
    for (const word of wordRows) {
      const level = (word.level || 'Unspecified').toUpperCase();
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
      topLearners
    };
  }

  private buildDailyActive(progressRows: ProgressRow[]): DailyActivePoint[] {
    const usersByDay = new Map<string, Set<string>>();

    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      usersByDay.set(day.toISOString().slice(0, 10), new Set());
    }

    for (const row of progressRows) {
      if (!row.updated_at) continue;
      const key = new Date(row.updated_at).toISOString().slice(0, 10);
      usersByDay.get(key)?.add(row.user_id);
    }

    return Array.from(usersByDay.entries()).map(([date, users]) => ({ date, count: users.size }));
  }
}
