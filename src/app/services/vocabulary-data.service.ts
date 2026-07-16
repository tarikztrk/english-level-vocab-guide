import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class VocabularyDataService {
  constructor(private supabaseService: SupabaseService) {}

  async getWords() {
    const { data, error } = await this.supabaseService.client.from('words').select('*');
    if (error) {
      throw error;
    }
    return data;
  }

  async saveProgress(wordId: number, updates: { learned?: boolean; bookmarked?: boolean }) {
    const { data, error } = await this.supabaseService.client
      .from('user_progress')
      .upsert({ word_id: wordId, ...updates }, { onConflict: 'word_id' })
      .select();

    if (error) {
      throw error;
    }

    return data;
  }
}
