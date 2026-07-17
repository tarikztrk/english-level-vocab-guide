import { Component, OnInit } from '@angular/core';
import { AuthenticationRequiredError, VocabularyDataService, VocabularyWord } from '../../services/vocabulary-data.service';

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
  sortOptions = ['A-Z', 'Learned', 'New'];

  get categories(): string[] {
    const cats = new Set(this.vocabulary.map(item => item.category));
    return ['All', ...Array.from(cats)].filter(c => c);
  }
  progressMessage = '';
  isLoading = true;
  loadError = '';
  private progressMessageTimeout?: ReturnType<typeof setTimeout>;

  vocabulary: VocabularyWord[] = [];

  private readonly fallbackVocabulary: VocabularyWord[] = [
    { id: 1, word: 'Inherent', phonetic: '/ɪnˈhɪər.ənt/', meaning: 'Doğasında olan, kalıtımsal', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: true, bookmarked: true },
    { id: 2, word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', level: 'B1', category: 'Business', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 3, word: 'Ambiguous', phonetic: '/æmˈbɪɡ.ju.əs/', meaning: 'Belirsiz, muğlak', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 4, word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', level: 'A2', category: 'Daily', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 5, word: 'Evaluate', phonetic: '/ɪnˈvæl.ju.eɪt/', meaning: 'Değerlendirmek', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: true, bookmarked: false },
    { id: 6, word: 'Collaborate', phonetic: '/kəˈlæb.ə.reɪt/', meaning: 'İşbirliği yapmak', level: 'B1', category: 'Business', example: '', audioUrl: '', learned: false, bookmarked: true },
    { id: 7, word: 'Constraint', phonetic: '/kənˈstreɪnt/', meaning: 'Kısıtlama, zorlama', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false }
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

  toggleLearned(word: VocabularyWord) {
    word.learned = !word.learned;

    if (word.id) {
      void this.vocabularyDataService.saveProgress(word.id, { learned: word.learned }).catch((error) => {
        word.learned = !word.learned;
        this.showProgressMessage(error instanceof AuthenticationRequiredError
          ? error.message
          : 'Could not save learned state. Please try again.');
        console.error('Could not save learned state', error);
      });
    }
  }

  toggleBookmark(word: VocabularyWord) {
    word.bookmarked = !word.bookmarked;

    if (word.id) {
      void this.vocabularyDataService.saveProgress(word.id, { bookmarked: word.bookmarked }).catch((error) => {
        word.bookmarked = !word.bookmarked;
        this.showProgressMessage(error instanceof AuthenticationRequiredError
          ? error.message
          : 'Could not save bookmark state. Please try again.');
        console.error('Could not save bookmark state', error);
      });
    }
  }

  dismissProgressMessage() {
    this.progressMessage = '';

    if (this.progressMessageTimeout) {
      clearTimeout(this.progressMessageTimeout);
    }
  }

  private async loadVocabulary() {
    this.isLoading = true;
    this.loadError = '';

    try {
      const data = await this.vocabularyDataService.getWords();
      this.vocabulary = data;
    } catch (error) {
      console.error('Could not load vocabulary from Supabase. Falling back to sample data.', error);
      this.loadError = 'Could not load vocabulary from Supabase. Showing sample data.';
      this.vocabulary = this.fallbackVocabulary;
    } finally {
      this.isLoading = false;
    }
  }

  private showProgressMessage(message: string) {
    this.progressMessage = message;

    if (this.progressMessageTimeout) {
      clearTimeout(this.progressMessageTimeout);
    }

    this.progressMessageTimeout = setTimeout(() => {
      this.progressMessage = '';
    }, 4000);
  }
}
