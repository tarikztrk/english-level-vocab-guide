import { Component, OnInit } from '@angular/core';
import { AuthenticationRequiredError, VocabularyDataService, VocabularyWord } from '../../services/vocabulary-data.service';
import { PronunciationService } from '../../services/pronunciation.service';

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

  constructor(
    private vocabularyDataService: VocabularyDataService,
    private pronunciationService: PronunciationService
  ) {}

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

  vocabularyItems: VocabularyWord[] = [];
  filteredVocabulary: VocabularyWord[] = [];
  categories: string[] = ['All'];

  currentTotal = 0;
  currentLearned = 0;
  currentMastery = 0;
  activeLevelLabel = '';

  wordOfTheDay: VocabularyWord | null = null;
  selectedIds = new Set<number>();
  isBulkSaving = false;

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
      const term = this.search.trim().toLowerCase();
      const matchesSearch = term === '' || item.word.toLowerCase().includes(term) || item.meaning.toLowerCase().includes(term);
      return matchesLevel && matchesCategory && matchesSearch;
    });

    this.currentTotal = this.filteredVocabulary.length;
    this.currentLearned = this.filteredVocabulary.filter(item => item.learned).length;
    this.currentMastery = this.currentTotal > 0 ? Math.round((this.currentLearned / this.currentTotal) * 100) : 0;

    // Drop selections that the current filter no longer shows.
    const visibleIds = new Set(this.filteredVocabulary.map((item) => item.id));
    this.selectedIds = new Set(Array.from(this.selectedIds).filter((id) => visibleIds.has(id)));
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

  listen(item: VocabularyWord) {
    this.pronunciationService.play(item);
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

  toggleBookmark(item: VocabularyWord) {
    item.bookmarked = !item.bookmarked;

    if (item.id) {
      void this.vocabularyDataService.saveProgress(item.id, { bookmarked: item.bookmarked }).catch((error) => {
        item.bookmarked = !item.bookmarked;
        this.showProgressMessage(error instanceof AuthenticationRequiredError
          ? error.message
          : 'Could not save bookmark state. Please try again.');
        console.error('Could not save bookmark state', error);
      });
    }
  }

  isSelected(item: VocabularyWord) {
    return this.selectedIds.has(item.id);
  }

  toggleSelection(item: VocabularyWord) {
    if (this.selectedIds.has(item.id)) {
      this.selectedIds.delete(item.id);
    } else {
      this.selectedIds.add(item.id);
    }
  }

  get allVisibleSelected(): boolean {
    return this.filteredVocabulary.length > 0 && this.selectedIds.size === this.filteredVocabulary.length;
  }

  toggleSelectAll() {
    if (this.allVisibleSelected) {
      this.selectedIds.clear();
      return;
    }
    this.selectedIds = new Set(this.filteredVocabulary.map((item) => item.id));
  }

  /** Marks every selected word as learned, keeping the UI honest if a save fails. */
  async markSelectedAsLearned() {
    const targets = this.filteredVocabulary.filter((item) => this.selectedIds.has(item.id) && !item.learned);

    if (targets.length === 0) {
      return;
    }

    this.isBulkSaving = true;

    for (const item of targets) {
      item.learned = true;
    }
    this.onFilterChange();

    const results = await Promise.allSettled(
      targets.map((item) => this.vocabularyDataService.saveProgress(item.id, { learned: true }))
    );

    const failures = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];

    if (failures.length > 0) {
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'rejected') {
          targets[i].learned = false;
        }
      }
      this.onFilterChange();

      const firstReason = failures[0].reason;
      this.showProgressMessage(firstReason instanceof AuthenticationRequiredError
        ? firstReason.message
        : `Could not save ${failures.length} of ${targets.length} words. Please try again.`);
      console.error('Could not save bulk progress', firstReason);
    } else {
      this.selectedIds.clear();
      this.showProgressMessage(`Marked ${targets.length} word${targets.length === 1 ? '' : 's'} as learned.`);
    }

    this.isBulkSaving = false;
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
      this.wordOfTheDay = this.pickWordOfTheDay();
      this.onFilterChange();
    }
  }

  /**
   * Picks a stable word for the current calendar day so the card does not
   * change on every reload but still rotates daily.
   */
  private pickWordOfTheDay(): VocabularyWord | null {
    if (this.vocabularyItems.length === 0) {
      return null;
    }

    const startOfYear = new Date(new Date().getFullYear(), 0, 0);
    const dayOfYear = Math.floor((Date.now() - startOfYear.getTime()) / 86400000);
    return this.vocabularyItems[dayOfYear % this.vocabularyItems.length];
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
