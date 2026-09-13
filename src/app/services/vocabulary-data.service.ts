import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export type WordStatus = 'draft' | 'published' | 'archived';

/** Grammatical part of speech, distinct from the topical `category` (Academic/Business/Daily). */
export const WORD_TYPES = ['sıfat', 'isim', 'fiil', 'zarf', 'deyim', 'isim öbeği'] as const;

/** Fields a word must have before it can be published; drives the admin panel's publish gating. */
export const REQUIRED_FOR_PUBLISH: (keyof VocabularyWord)[] = ['word', 'level', 'wordType', 'meaning', 'phonetic', 'example'];

export interface VocabularyWord {
  id: number;
  word: string;
  phonetic: string;
  meaning: string;
  level: string;
  category: string;
  wordType: string;
  example: string;
  audioUrl: string;
  learned: boolean;
  bookmarked: boolean;
  status: WordStatus;
  updatedAt: string;
  updatedByEmail: string;
}

export type WordFormModel = Omit<VocabularyWord, 'id' | 'learned' | 'bookmarked' | 'status' | 'updatedAt' | 'updatedByEmail'>;

interface WordRow {
  id: number;
  word: string;
  phonetic: string | null;
  meaning: string;
  level: string | null;
  category: string | null;
  word_type: string | null;
  example: string | null;
  audio_url: string | null;
  learned: boolean | null;
  bookmarked: boolean | null;
  status: string | null;
  updated_at: string | null;
  updated_by_email: string | null;
}

interface UserProgressRow {
  word_id: number;
  learned: boolean | null;
  bookmarked: boolean | null;
}

const WORD_COLUMNS = 'id, word, phonetic, meaning, level, category, word_type, example, audio_url, learned, bookmarked, status, updated_at, updated_by_email';

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('İlerlemenizi kaydetmek için giriş yapın.');
    this.name = 'AuthenticationRequiredError';
  }
}

export interface ImportRowResult {
  row: number;
  values: WordFormModel;
  outcome: 'new' | 'duplicate' | 'error';
  errorReason?: string;
  /** Set when outcome is 'duplicate': the existing word this row matches. */
  existingId?: number;
}

export interface BulkImportSummary {
  created: VocabularyWord[];
  overwritten: VocabularyWord[];
  skipped: number;
  errors: number;
}

@Injectable({
  providedIn: 'root'
})
export class VocabularyDataService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  /** Public-facing words: only what's actually published, merged with the caller's own progress. */
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
        .select(WORD_COLUMNS)
        .eq('status', 'published')
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

  /**
   * Word ids the signed-in user touched most recently, newest first — the
   * "kaldığın yer" signal the home screen reads. Empty for signed-out visitors.
   */
  async getRecentlyStudiedWordIds(limit = 6): Promise<number[]> {
    await this.authService.waitUntilInitialized();

    const userId = this.authService.currentUser?.id;
    if (!userId) {
      return [];
    }

    const { data, error } = await this.supabaseService.client
      .from('user_progress')
      .select('word_id, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: any) => Number(row.word_id));
  }

  /** Admin-only: every word regardless of status, for the management table. */
  async getWordsForAdmin(): Promise<VocabularyWord[]> {
    const { data, error } = await this.supabaseService.client
      .from('words')
      .select(WORD_COLUMNS)
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as WordRow[]).map((word) => this.toVocabularyWord(word));
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

  /** New words always land as drafts; use publishWord() once required fields are filled in. */
  async createWord(word: WordFormModel): Promise<VocabularyWord> {
    const { data, error } = await this.supabaseService.client
      .from('words')
      .insert({ ...this.toWordRow(word), status: 'draft', updated_by_email: this.currentEmail() })
      .select(WORD_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    const created = this.toVocabularyWord(data as WordRow);
    await this.logChange(created.id, created.word, 'create');
    return created;
  }

  async updateWord(id: number, word: WordFormModel): Promise<VocabularyWord> {
    const { data, error } = await this.supabaseService.client
      .from('words')
      .update({ ...this.toWordRow(word), updated_by_email: this.currentEmail() })
      .eq('id', id)
      .select(WORD_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    const updated = this.toVocabularyWord(data as WordRow);
    await this.logChange(updated.id, updated.word, 'update');
    return updated;
  }

  /** Flips status to 'published'. Callers must check REQUIRED_FOR_PUBLISH first; this is a hard stop either way. */
  async publishWord(word: VocabularyWord): Promise<VocabularyWord> {
    const missing = REQUIRED_FOR_PUBLISH.filter((field) => !String(word[field] ?? '').trim());
    if (missing.length > 0) {
      throw new Error(`Yayına engel eksik alan(lar): ${missing.join(', ')}`);
    }

    return this.setStatus(word, 'published', 'publish');
  }

  /** Soft delete: the word disappears from the public list but can be brought back with restoreWord(). */
  async archiveWord(word: VocabularyWord): Promise<VocabularyWord> {
    return this.setStatus(word, 'archived', 'archive');
  }

  async restoreWord(word: VocabularyWord, to: WordStatus = 'published'): Promise<VocabularyWord> {
    return this.setStatus(word, to, 'restore');
  }

  async bulkSetStatus(words: VocabularyWord[], status: WordStatus): Promise<VocabularyWord[]> {
    const results: VocabularyWord[] = [];
    for (const word of words) {
      const action = status === 'published' ? 'publish' : status === 'archived' ? 'archive' : 'restore';
      results.push(await this.setStatus(word, status, action));
    }
    return results;
  }

  async bulkSetLevel(words: VocabularyWord[], level: string): Promise<VocabularyWord[]> {
    const results: VocabularyWord[] = [];
    for (const word of words) {
      results.push(await this.updateWord(word.id, { ...this.stripMeta(word), level }));
    }
    return results;
  }

  /**
   * Inserts every row marked 'new' as a draft, and overwrites the matched existing
   * word for every row marked 'duplicate' whose caller opted to overwrite. Rows
   * marked 'error' or left as skipped duplicates are never sent to the database.
   */
  async bulkImport(rows: ImportRowResult[], overwriteDuplicates: boolean): Promise<BulkImportSummary> {
    const toCreate = rows.filter((r) => r.outcome === 'new');
    const toOverwrite = overwriteDuplicates ? rows.filter((r) => r.outcome === 'duplicate') : [];

    const created: VocabularyWord[] = [];
    if (toCreate.length > 0) {
      const { data, error } = await this.supabaseService.client
        .from('words')
        .insert(toCreate.map((r) => ({ ...this.toWordRow(r.values), status: 'draft', updated_by_email: this.currentEmail() })))
        .select(WORD_COLUMNS);

      if (error) {
        throw error;
      }

      created.push(...((data ?? []) as WordRow[]).map((row) => this.toVocabularyWord(row)));
    }

    const overwritten: VocabularyWord[] = [];
    for (const row of toOverwrite) {
      if (!row.existingId) continue;
      overwritten.push(await this.updateWord(row.existingId, row.values));
    }

    if (created.length > 0 || overwritten.length > 0) {
      await this.logChange(
        null,
        `${created.length + overwritten.length} kelime`,
        'import',
        `${created.length} yeni, ${overwritten.length} üzerine yazıldı`
      );
    }

    return {
      created,
      overwritten,
      skipped: rows.filter((r) => r.outcome === 'duplicate').length - toOverwrite.length,
      errors: rows.filter((r) => r.outcome === 'error').length
    };
  }

  async getRecentChanges(limit = 100): Promise<{
    id: number;
    wordId: number | null;
    wordLabel: string;
    action: string;
    changedByEmail: string;
    changedAt: string;
    details: string;
  }[]> {
    const { data, error } = await this.supabaseService.client
      .from('word_change_log')
      .select('id, word_id, word_label, action, changed_by_email, changed_at, details')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      id: Number(row.id),
      wordId: row.word_id === null ? null : Number(row.word_id),
      wordLabel: row.word_label,
      action: row.action,
      changedByEmail: row.changed_by_email ?? '',
      changedAt: row.changed_at,
      details: row.details ?? ''
    }));
  }

  private async setStatus(word: VocabularyWord, status: WordStatus, action: 'publish' | 'archive' | 'restore'): Promise<VocabularyWord> {
    const { data, error } = await this.supabaseService.client
      .from('words')
      .update({
        status,
        archived_at: status === 'archived' ? new Date().toISOString() : null,
        updated_by_email: this.currentEmail()
      })
      .eq('id', word.id)
      .select(WORD_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    const result = this.toVocabularyWord(data as WordRow);
    await this.logChange(result.id, result.word, action);
    return result;
  }

  private async logChange(wordId: number | null, wordLabel: string, action: string, details = '') {
    const { error } = await this.supabaseService.client.from('word_change_log').insert({
      word_id: wordId,
      word_label: wordLabel,
      action,
      changed_by: this.authService.currentUser?.id ?? null,
      changed_by_email: this.currentEmail(),
      details
    });

    if (error) {
      // The edit already succeeded; a logging failure shouldn't roll it back or block the admin.
      console.error('Could not write to word_change_log', error);
    }
  }

  private currentEmail(): string {
    return this.authService.currentUser?.email ?? '';
  }

  private stripMeta(word: VocabularyWord): WordFormModel {
    const { id, learned, bookmarked, status, updatedAt, updatedByEmail, ...rest } = word;
    return rest;
  }

  private toWordRow(word: WordFormModel) {
    return {
      word: word.word,
      phonetic: word.phonetic || null,
      meaning: word.meaning,
      level: normalizeLevel(word.level) || null,
      category: normalizeCategory(word.category) || null,
      word_type: (word.wordType || '').trim() || null,
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
      wordType: word.word_type ?? '',
      example: word.example ?? '',
      audioUrl: word.audio_url ?? '',
      learned: Boolean(word.learned),
      bookmarked: Boolean(word.bookmarked),
      status: (word.status as WordStatus) ?? 'published',
      updatedAt: word.updated_at ?? '',
      updatedByEmail: word.updated_by_email ?? ''
    };
  }

  async deleteWord(id: number): Promise<void> {
    const { error } = await this.supabaseService.client.from('words').delete().eq('id', id);

    if (error) {
      throw error;
    }
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
