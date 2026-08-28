import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface VocabularyWord {
  id: number;
  word: string;
  phonetic: string;
  meaning: string;
  level: string;
  category: string;
  example: string;
  audioUrl: string;
  learned: boolean;
  bookmarked: boolean;
}

interface WordRow {
  id: number;
  word: string;
  phonetic: string | null;
  meaning: string;
  level: string | null;
  category: string | null;
  example: string | null;
  audio_url: string | null;
  learned: boolean | null;
  bookmarked: boolean | null;
}

interface UserProgressRow {
  word_id: number;
  learned: boolean | null;
  bookmarked: boolean | null;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('İlerlemenizi kaydetmek için giriş yapın.');
    this.name = 'AuthenticationRequiredError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class VocabularyDataService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async getWords(): Promise<VocabularyWord[]> {
    await this.authService.waitUntilInitialized();

    const userId = this.authService.currentUser?.id;
    const progressQuery = userId
      ? this.supabaseService.client
          .from('user_progress')
          .select('word_id, learned, bookmarked')
          .eq('user_id', userId)
      : Promise.resolve({ data: [], error: null });

    const [{ data: words, error: wordsError }, { data: progress, error: progressError }] = await Promise.all([
      this.supabaseService.client
        .from('words')
        .select('id, word, phonetic, meaning, level, category, example, audio_url, learned, bookmarked')
        .order('id', { ascending: true }),
      progressQuery
    ]);

    if (wordsError) {
      throw wordsError;
    }

    if (progressError) {
      throw progressError;
    }

    const progressByWordId = new Map<number, UserProgressRow>(
      ((progress ?? []) as UserProgressRow[]).map((item) => [Number(item.word_id), item])
    );

    return ((words ?? []) as WordRow[]).map((word) => {
      const wordProgress = progressByWordId.get(Number(word.id));

      return {
        ...this.toVocabularyWord(word),
        learned: Boolean(wordProgress?.learned ?? word.learned),
        bookmarked: Boolean(wordProgress?.bookmarked ?? word.bookmarked)
      };
    });
  }

  async saveProgress(wordId: number, updates: { learned?: boolean; bookmarked?: boolean }) {
    await this.authService.waitUntilInitialized();

    const userId = this.authService.currentUser?.id;

    if (!userId) {
      throw new AuthenticationRequiredError();
    }

    const { data, error } = await this.supabaseService.client
      .from('user_progress')
      .upsert(
        { user_id: userId, word_id: wordId, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,word_id' }
      )
      .select();

    if (error) {
      throw error;
    }

    return data;
  }

  async createWord(word: Omit<VocabularyWord, 'id' | 'learned' | 'bookmarked'>): Promise<VocabularyWord> {
    const { data, error } = await this.supabaseService.client
      .from('words')
      .insert(this.toWordRow(word))
      .select('id, word, phonetic, meaning, level, category, example, audio_url, learned, bookmarked')
      .single();

    if (error) {
      throw error;
    }

    return this.toVocabularyWord(data as WordRow);
  }

  async updateWord(id: number, word: Omit<VocabularyWord, 'id' | 'learned' | 'bookmarked'>): Promise<VocabularyWord> {
    const { data, error } = await this.supabaseService.client
      .from('words')
      .update(this.toWordRow(word))
      .eq('id', id)
      .select('id, word, phonetic, meaning, level, category, example, audio_url, learned, bookmarked')
      .single();

    if (error) {
      throw error;
    }

    return this.toVocabularyWord(data as WordRow);
  }

  async deleteWord(id: number): Promise<void> {
    const { error } = await this.supabaseService.client.from('words').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }

  private toWordRow(word: Omit<VocabularyWord, 'id' | 'learned' | 'bookmarked'>) {
    return {
      word: word.word,
      phonetic: word.phonetic || null,
      meaning: word.meaning,
      level: normalizeLevel(word.level) || null,
      category: normalizeCategory(word.category) || null,
      example: word.example || null,
      audio_url: word.audioUrl || null
    };
  }

  private toVocabularyWord(word: WordRow): VocabularyWord {
    return {
      id: Number(word.id),
      word: word.word,
      phonetic: word.phonetic ?? '',
      meaning: word.meaning,
      level: normalizeLevel(word.level) || 'B1',
      category: normalizeCategory(word.category) || 'Academic',
      example: word.example ?? '',
      audioUrl: word.audio_url ?? '',
      learned: Boolean(word.learned),
      bookmarked: Boolean(word.bookmarked)
    };
  }
}

/**
 * Levels and categories reach us with inconsistent casing: rows seeded early on
 * use "B1"/"Academic" while the admin form used to write "b1"/"academic".
 * Everything downstream (dashboard level tabs, list-view category buttons)
 * compares these as exact strings, so normalise on the way in and out.
 */
export function normalizeLevel(level: string | null | undefined): string {
  return (level ?? '').trim().toUpperCase();
}

export function normalizeCategory(category: string | null | undefined): string {
  const trimmed = (category ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
