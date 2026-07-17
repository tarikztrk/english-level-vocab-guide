import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

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

@Injectable({
  providedIn: 'root'
})
export class VocabularyDataService {
  constructor(private supabaseService: SupabaseService) {}

  async getWords(): Promise<VocabularyWord[]> {
    const [{ data: words, error: wordsError }, { data: progress, error: progressError }] = await Promise.all([
      this.supabaseService.client
        .from('words')
        .select('id, word, phonetic, meaning, level, category, example, audio_url, learned, bookmarked')
        .order('id', { ascending: true }),
      this.supabaseService.client
        .from('user_progress')
        .select('word_id, learned, bookmarked')
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
        id: Number(word.id),
        word: word.word,
        phonetic: word.phonetic ?? '',
        meaning: word.meaning,
        level: word.level ?? 'B1',
        category: word.category ?? 'Academic',
        example: word.example ?? '',
        audioUrl: word.audio_url ?? '',
        learned: Boolean(wordProgress?.learned ?? word.learned),
        bookmarked: Boolean(wordProgress?.bookmarked ?? word.bookmarked)
      };
    });
  }

  async saveProgress(wordId: number, updates: { learned?: boolean; bookmarked?: boolean }) {
    const { data, error } = await this.supabaseService.client
      .from('user_progress')
      .upsert({ word_id: wordId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'word_id' })
      .select();

    if (error) {
      throw error;
    }

    return data;
  }
}
