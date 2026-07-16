import { Component, OnInit } from '@angular/core';
import { VocabularyDataService } from '../../services/vocabulary-data.service';

interface WordItem {
  id?: number;
  word: string;
  phonetic: string;
  meaning: string;
  category: string;
  learned: boolean;
  bookmarked: boolean;
}

@Component({
  selector: 'app-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.css']
})
export class ListViewComponent implements OnInit {
  title = 'Word Explorer';

  constructor(private vocabularyDataService: VocabularyDataService) {}
  search = '';
  selectedCategory = 'All';
  selectedSort = 'A-Z';
  categories = ['All', 'Academic', 'Business', 'Daily'];
  sortOptions = ['A-Z', 'Learned', 'New'];

  vocabulary: WordItem[] = [];

  private readonly fallbackVocabulary: WordItem[] = [
    { id: 1, word: 'Inherent', phonetic: '/ɪnˈhɪər.ənt/', meaning: 'Doğasında olan, kalıtımsal', category: 'Academic', learned: true, bookmarked: true },
    { id: 2, word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', category: 'Business', learned: false, bookmarked: false },
    { id: 3, word: 'Ambiguous', phonetic: '/æmˈbɪɡ.ju.əs/', meaning: 'Belirsiz, muğlak', category: 'Academic', learned: false, bookmarked: false },
    { id: 4, word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', category: 'Daily', learned: false, bookmarked: false },
    { id: 5, word: 'Evaluate', phonetic: '/ɪnˈvæl.ju.eɪt/', meaning: 'Değerlendirmek', category: 'Academic', learned: true, bookmarked: false },
    { id: 6, word: 'Collaborate', phonetic: '/kəˈlæb.ə.reɪt/', meaning: 'İşbirliği yapmak', category: 'Business', learned: false, bookmarked: true },
    { id: 7, word: 'Constraint', phonetic: '/kənˈstreɪnt/', meaning: 'Kısıtlama, zorlama', category: 'Academic', learned: false, bookmarked: false }
  ];

  ngOnInit() {
    void this.loadVocabulary();
  }

  get filteredWords() {
    const query = this.search.trim().toLowerCase();
    const filtered = this.vocabulary.filter((item) => {
      const matchesCategory = this.selectedCategory === 'All' || item.category === this.selectedCategory;
      const matchesSearch = query.length === 0 || item.word.toLowerCase().includes(query) || item.meaning.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (this.selectedSort === 'Learned') {
        return Number(b.learned) - Number(a.learned);
      }
      if (this.selectedSort === 'New') {
        return Number(a.learned) - Number(b.learned);
      }
      return a.word.localeCompare(b.word);
    });
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  setSort(option: string) {
    this.selectedSort = option;
  }

  toggleLearned(word: WordItem) {
    word.learned = !word.learned;

    if (word.id) {
      void this.vocabularyDataService.saveProgress(word.id, { learned: word.learned }).catch((error) => {
        console.error('Could not save learned state', error);
      });
    }
  }

  toggleBookmark(word: WordItem) {
    word.bookmarked = !word.bookmarked;

    if (word.id) {
      void this.vocabularyDataService.saveProgress(word.id, { bookmarked: word.bookmarked }).catch((error) => {
        console.error('Could not save bookmark state', error);
      });
    }
  }

  private async loadVocabulary() {
    try {
      const data = await this.vocabularyDataService.getWords();
      this.vocabulary = Array.isArray(data) && data.length > 0
        ? data.map((item: any, index: number) => ({
            id: item.id ?? index + 1,
            word: item.word ?? '',
            phonetic: item.phonetic ?? '',
            meaning: item.meaning ?? '',
            category: item.category ?? 'Academic',
            learned: Boolean(item.learned),
            bookmarked: Boolean(item.bookmarked)
          }))
        : this.fallbackVocabulary;
    } catch (error) {
      console.error('Could not load vocabulary from Supabase. Falling back to sample data.', error);
      this.vocabulary = this.fallbackVocabulary;
    }
  }
}
