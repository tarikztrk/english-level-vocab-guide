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
  title = 'EnglishAcademy';

  constructor(
    private vocabularyDataService: VocabularyDataService,
    private pronunciationService: PronunciationService
  ) {}

  tabs: LevelTab[] = [
    { label: 'Tüm Seviyeler', active: true },
    { label: 'A1', active: false },
    { label: 'A2', active: false },
    { label: 'B1', active: false },
    { label: 'B2', active: false },
    { label: 'C1', active: false },
    { label: 'C2', active: false }
  ];

  selectedCategory = 'Tümü';
  search = '';
  progressMessage = '';
  isLoading = true;
  loadError = '';
  private progressMessageTimeout?: ReturnType<typeof setTimeout>;

  vocabularyItems: VocabularyWord[] = [];
  filteredVocabulary: VocabularyWord[] = [];
  categories: string[] = ['Tümü'];

  currentTotal = 0;
  currentLearned = 0;
  currentMastery = 0;
  activeLevelLabel = '';

  currentPage = 1;
  pageSize = 10;

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

    this.activeLevelLabel = !activeTab || activeTabLabel === 'Tüm Seviyeler' ? '' : (activeTabLabel + ' ');

    this.filteredVocabulary = this.vocabularyItems.filter((item) => {
      const matchesLevel = !activeTabLabel || activeTabLabel === 'Tüm Seviyeler' || item.level === activeTabLabel;
      const matchesCategory = this.selectedCategory === 'Tümü' || item.category === this.selectedCategory;
      const term = this.search.trim().toLowerCase();
      const matchesSearch = term === '' || item.word.toLowerCase().includes(term) || item.meaning.toLowerCase().includes(term);
      return matchesLevel && matchesCategory && matchesSearch;
    });

    this.currentTotal = this.filteredVocabulary.length;
    this.currentLearned = this.filteredVocabulary.filter(item => item.learned).length;
    this.currentMastery = this.currentTotal > 0 ? Math.round((this.currentLearned / this.currentTotal) * 100) : 0;
    this.currentPage = Math.min(this.currentPage, this.totalPages);

    // Drop selections that the current filter no longer shows.
    const visibleIds = new Set(this.filteredVocabulary.map((item) => item.id));
    this.selectedIds = new Set(Array.from(this.selectedIds).filter((id) => visibleIds.has(id)));
  }

  get paginatedVocabulary(): VocabularyWord[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredVocabulary.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredVocabulary.length / this.pageSize) || 1;
  }

  get firstItemIndex(): number {
    return this.filteredVocabulary.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredVocabulary.length);
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  setPage(page: number) {
    this.currentPage = page;
  }

  /** Up to 5 page numbers centered on the current page. */
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  selectTab(label: string) {
    this.tabs = this.tabs.map((tab) => ({ ...tab, active: tab.label === label }));
    this.currentPage = 1;
    this.onFilterChange();
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.onFilterChange();
  }

  onSearchChange() {
    this.currentPage = 1;
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
          : 'İlerleme kaydedilemedi. Lütfen tekrar deneyin.');
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
          : 'Kaydedilenler güncellenemedi. Lütfen tekrar deneyin.');
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
        : `${targets.length} kelimeden ${failures.length} tanesi kaydedilemedi. Lütfen tekrar deneyin.`);
      console.error('Could not save bulk progress', firstReason);
    } else {
      this.selectedIds.clear();
      this.showProgressMessage(`${targets.length} kelime öğrenildi olarak işaretlendi.`);
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
      this.loadError = 'Kelimeler yüklenemedi. Örnek veriler gösteriliyor.';
      this.vocabularyItems = this.fallbackVocabulary;
    } finally {
      this.isLoading = false;
      const cats = new Set(this.vocabularyItems.map(item => item.category));
      this.categories = ['Tümü', ...Array.from(cats)].filter(c => c);
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
