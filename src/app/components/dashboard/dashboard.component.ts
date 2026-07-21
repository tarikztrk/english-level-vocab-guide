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
  filteredVocabulary: VocabularyWord[] = [];
  categories: string[] = ['All'];

  currentTotal = 0;
  currentLearned = 0;
  currentMastery = 0;
  activeLevelLabel = '';

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

  onFilterChange() {
    const activeTab = this.tabs.find(t => t.active);
    const activeTabLabel = activeTab?.label;
    
    this.activeLevelLabel = !activeTab || activeTabLabel === 'All Levels' ? '' : (activeTabLabel + ' ');

    this.filteredVocabulary = this.vocabularyItems.filter((item) => {
      const matchesLevel = !activeTabLabel || activeTabLabel === 'All Levels' || item.level === activeTabLabel;
      const matchesCategory = this.selectedCategory === 'All' || item.category === this.selectedCategory;
      const term = Math.max(0, this.search.trim().length) === 0 ? '' : this.search.toLowerCase();
      const matchesSearch = term === '' || item.word.toLowerCase().includes(term) || item.meaning.toLowerCase().includes(term);
      return matchesLevel && matchesCategory && matchesSearch;
    });

    this.currentTotal = this.filteredVocabulary.length;
    this.currentLearned = this.filteredVocabulary.filter(item => item.learned).length;
    this.currentMastery = this.currentTotal > 0 ? Math.round((this.currentLearned / this.currentTotal) * 100) : 0;
  }

  selectTab(label: string) {
    this.tabs = this.tabs.map((tab) => ({ ...tab, active: tab.label === label }));
    this.onFilterChange();
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.onFilterChange();
  }

  onSearchChange() {
    this.onFilterChange();
  }

  toggleLearned(item: VocabularyWord) {
    item.learned = !item.learned;
    this.onFilterChange();

    if (item.id) {
      void this.vocabularyDataService.saveProgress(item.id, { learned: item.learned }).catch((error) => {
        item.learned = !item.learned;
        this.onFilterChange();
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
      const cats = new Set(this.vocabularyItems.map(item => item.category));
      this.categories = ['All', ...Array.from(cats)].filter(c => c);
      this.onFilterChange();
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
