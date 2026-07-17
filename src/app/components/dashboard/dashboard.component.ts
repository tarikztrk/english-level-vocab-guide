import { Component, OnInit } from '@angular/core';
import { AuthenticationRequiredError, VocabularyDataService, VocabularyWord } from '../../services/vocabulary-data.service';

interface LevelTab {
  label: string;
  active: boolean;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  title = 'LexiLearn';

  constructor(private vocabularyDataService: VocabularyDataService) {}

  tabs: LevelTab[] = [
    { label: 'All Levels', active: true },
    { label: 'A1', active: false },
    { label: 'A2', active: false },
    { label: 'B1', active: false },
    { label: 'B2', active: false },
    { label: 'C1', active: false },
    { label: 'C2', active: false }
  ];

  selectedCategory = 'All';

  get categories(): string[] {
    const cats = new Set(this.vocabularyItems.map(item => item.category));
    return ['All', ...Array.from(cats)].filter(c => c);
  }

  get totalWords(): number {
    return this.vocabularyItems.length;
  }

  get learnedWords(): number {
    return this.vocabularyItems.filter(item => item.learned).length;
  }

  get overallMastery(): number {
    return this.totalWords > 0 ? Math.round((this.learnedWords / this.totalWords) * 100) : 0;
  }

  get activeLevelLabel(): string {
    const tab = this.tabs.find(t => t.active);
    return tab?.label === 'All Levels' || !tab ? '' : (tab.label + ' ');
  }
  search = '';
  progressMessage = '';
  isLoading = true;
  loadError = '';
  private progressMessageTimeout?: ReturnType<typeof setTimeout>;

  quickActions = [
    { title: 'Flashcards', description: 'Review 10 words in 5 minutes', icon: 'view_carousel' },
    { title: 'Listening', description: 'Hear native pronunciation', icon: 'volume_up' },
    { title: 'Practice Quiz', description: 'Test your recall instantly', icon: 'quiz' }
  ];

  vocabularyItems: VocabularyWord[] = [];

  private readonly fallbackVocabulary: VocabularyWord[] = [
    { id: 1, word: 'Inherent', phonetic: '/ɪnˈhɪər.ənt/', meaning: 'Doğasında olan, kalıtımsal', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 2, word: 'Abstract', phonetic: '/ˈæb.strækt/', meaning: 'Soyut, özet', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: true, bookmarked: false },
    { id: 3, word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', level: 'B2', category: 'Business', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 4, word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', level: 'A2', category: 'Daily', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 5, word: 'Evaluate', phonetic: '/ɪˈvæl.ju.eɪt/', meaning: 'Değerlendirmek', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false }
  ];

  ngOnInit() {
    void this.loadVocabulary();
  }

  get filteredVocabulary() {
    const activeTab = this.tabs.find(t => t.active)?.label;
    return this.vocabularyItems.filter((item) => {
      const matchesLevel = !activeTab || activeTab === 'All Levels' || item.level === activeTab;
      const matchesCategory = this.selectedCategory === 'All' || item.category === this.selectedCategory;
      const matchesSearch = this.search.trim().length === 0 || item.word.toLowerCase().includes(this.search.toLowerCase()) || item.meaning.toLowerCase().includes(this.search.toLowerCase());
      return matchesLevel && matchesCategory && matchesSearch;
    });
  }

  selectTab(label: string) {
    this.tabs = this.tabs.map((tab) => ({ ...tab, active: tab.label === label }));
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  toggleLearned(item: VocabularyWord) {
    item.learned = !item.learned;

    if (item.id) {
      void this.vocabularyDataService.saveProgress(item.id, { learned: item.learned }).catch((error) => {
        item.learned = !item.learned;
        this.showProgressMessage(error instanceof AuthenticationRequiredError
          ? error.message
          : 'Could not save vocabulary progress. Please try again.');
        console.error('Could not save vocabulary progress', error);
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
      this.vocabularyItems = data;
    } catch (error) {
      console.error('Could not load vocabulary from Supabase. Falling back to sample data.', error);
      this.loadError = 'Could not load vocabulary from Supabase. Showing sample data.';
      this.vocabularyItems = this.fallbackVocabulary;
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
