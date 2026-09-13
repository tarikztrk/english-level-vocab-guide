import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationRequiredError, VocabularyDataService, VocabularyWord } from '../../services/vocabulary-data.service';
import { PronunciationService } from '../../services/pronunciation.service';
import { levelBadgeStyle } from '../../shared/level-badge';
import { normalizeForSearch } from '../../shared/text';
import { CEFR_LEVELS, levelTitle } from '../../shared/levels';

const SEARCH_DEBOUNCE_MS = 250;

@Component({
  selector: 'app-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.css']
})
export class ListViewComponent implements OnInit {
  title = 'Kelime Listesi';

  constructor(
    private vocabularyDataService: VocabularyDataService,
    private pronunciationService: PronunciationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  search = '';
  levels: string[] = ['Tümü', ...CEFR_LEVELS];
  levelCounts: Record<string, number> = {};
  selectedLevel = 'Tümü';
  selectedCategory = 'Tümü';
  /** Display labels are Turkish; the `value` keys stay stable for the sort logic. */
  selectedSort = 'az';
  sortOptions = [
    { value: 'az', label: 'A-Z' },
    { value: 'learned', label: 'Öğrenilenler' },
    { value: 'new', label: 'Yeniler' }
  ];
  selectedStatus = 'all';
  statusOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'learned', label: 'Öğrenildi' },
    { value: 'new', label: 'Yeni' }
  ];
  showBookmarkedOnly = false;

  categories: string[] = ['Tümü'];
  filteredWords: VocabularyWord[] = [];

  currentTotal = 0;
  currentLearned = 0;
  currentMastery = 0;

  /**
   * Progress for the selected level as a whole, deliberately ignoring search and the
   * secondary filters: the header bar answers "how far am I in B1", not "how far am I
   * in the three words I just searched for".
   */
  scopeTotal = 0;
  scopeLearned = 0;
  scopeMastery = 0;

  currentPage = 1;
  pageSize = 10;

  progressMessage = '';
  isLoading = true;
  loadError = '';
  private progressMessageTimeout?: ReturnType<typeof setTimeout>;
  private searchDebounceTimeout?: ReturnType<typeof setTimeout>;

  vocabulary: VocabularyWord[] = [];

  private readonly fallbackVocabulary: VocabularyWord[] = [
    { id: 1, word: 'Inherent', phonetic: '/ɪnˈhɪər.ənt/', meaning: 'Doğasında olan, kalıtımsal', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: true, bookmarked: true },
    { id: 2, word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', level: 'B1', category: 'Business', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 3, word: 'Ambiguous', phonetic: '/æmˈbɪɡ.ju.əs/', meaning: 'Belirsiz, muğlak', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 4, word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', level: 'A2', category: 'Daily', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 5, word: 'Evaluate', phonetic: '/ɪnˈvæl.ju.eɪt/', meaning: 'Değerlendirmek', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: true, bookmarked: false },
    { id: 6, word: 'Collaborate', phonetic: '/kəˈlæb.ə.reɪt/', meaning: 'İşbirliği yapmak', level: 'B1', category: 'Business', example: '', audioUrl: '', learned: false, bookmarked: true },
    { id: 7, word: 'Constraint', phonetic: '/kənˈstreɪnt/', meaning: 'Kısıtlama, zorlama', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false }
  ].map((word) => ({ ...word, wordType: '', status: 'published' as const, updatedAt: '', updatedByEmail: '' }));

  ngOnInit() {
    this.readStateFromUrl();
    void this.loadVocabulary();
  }

  readonly levelBadgeStyle = levelBadgeStyle;

  onFilterChange() {
    const term = normalizeForSearch(this.search.trim());
    let filtered = this.vocabulary.filter((item) => {
      const matchesLevel = this.selectedLevel === 'Tümü' || item.level === this.selectedLevel;
      const matchesCategory = this.selectedCategory === 'Tümü' || item.category === this.selectedCategory;
      const matchesSearch = term === ''
        || normalizeForSearch(item.word).includes(term)
        || normalizeForSearch(item.meaning).includes(term);
      const matchesBookmark = !this.showBookmarkedOnly || item.bookmarked;
      const matchesStatus = this.selectedStatus === 'all'
        || (this.selectedStatus === 'learned' ? item.learned : !item.learned);
      return matchesLevel && matchesCategory && matchesSearch && matchesBookmark && matchesStatus;
    });

    filtered = filtered.sort((a, b) => {
      if (this.selectedSort === 'learned') {
        return Number(b.learned) - Number(a.learned);
      }
      if (this.selectedSort === 'new') {
        return Number(a.learned) - Number(b.learned);
      }
      return a.word.localeCompare(b.word, 'tr');
    });

    this.filteredWords = filtered;
    this.currentTotal = filtered.length;
    this.currentLearned = filtered.filter(item => item.learned).length;
    this.currentMastery = this.currentTotal > 0 ? Math.round((this.currentLearned / this.currentTotal) * 100) : 0;
    this.currentPage = Math.min(this.currentPage, this.totalPages);

    const scope = this.selectedLevel === 'Tümü'
      ? this.vocabulary
      : this.vocabulary.filter((item) => item.level === this.selectedLevel);
    this.scopeTotal = scope.length;
    this.scopeLearned = scope.filter((item) => item.learned).length;
    this.scopeMastery = this.scopeTotal > 0 ? Math.round((this.scopeLearned / this.scopeTotal) * 100) : 0;
  }

  get activeLevelTitle(): string {
    return this.selectedLevel === 'Tümü' ? 'Tüm seviyeler' : levelTitle(this.selectedLevel);
  }

  get paginatedWords(): VocabularyWord[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredWords.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredWords.length / this.pageSize) || 1;
  }

  get firstItemIndex(): number {
    return this.filteredWords.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredWords.length);
  }

  /** Chips shown for every non-default filter, each removable on its own. */
  get activeFilters(): { key: string; label: string }[] {
    const chips: { key: string; label: string }[] = [];
    if (this.selectedLevel !== 'Tümü') chips.push({ key: 'level', label: this.selectedLevel });
    if (this.selectedCategory !== 'Tümü') chips.push({ key: 'category', label: this.selectedCategory });
    if (this.selectedStatus !== 'all') {
      const status = this.statusOptions.find((option) => option.value === this.selectedStatus);
      chips.push({ key: 'status', label: status?.label ?? this.selectedStatus });
    }
    if (this.showBookmarkedOnly) chips.push({ key: 'bookmark', label: 'Kaydedilenler' });
    if (this.search.trim() !== '') chips.push({ key: 'search', label: `“${this.search.trim()}”` });
    return chips;
  }

  get hasActiveFilters(): boolean {
    return this.activeFilters.length > 0;
  }

  clearFilter(key: string) {
    if (key === 'level') this.selectedLevel = 'Tümü';
    if (key === 'category') this.selectedCategory = 'Tümü';
    if (key === 'status') this.selectedStatus = 'all';
    if (key === 'bookmark') this.showBookmarkedOnly = false;
    if (key === 'search') this.search = '';
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
  }

  clearAllFilters() {
    this.search = '';
    this.selectedLevel = 'Tümü';
    this.selectedCategory = 'Tümü';
    this.selectedStatus = 'all';
    this.showBookmarkedOnly = false;
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
  }

  setStatus(status: string) {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
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

  onSearchChange() {
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }

    this.searchDebounceTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.onFilterChange();
      this.writeStateToUrl();
    }, SEARCH_DEBOUNCE_MS);
  }

  selectLevel(level: string) {
    this.selectedLevel = level;
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
  }

  setSort(option: string) {
    this.selectedSort = option;
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
  }

  toggleBookmarkedOnly() {
    this.showBookmarkedOnly = !this.showBookmarkedOnly;
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
  }

  /**
   * Hands the current filter set to the flashcard deck, so "study this list"
   * means the list actually on screen rather than the whole vocabulary.
   */
  studyFilteredDeck() {
    void this.router.navigate(['/flashcards'], {
      queryParams: {
        level: this.selectedLevel === 'Tümü' ? null : this.selectedLevel,
        category: this.selectedCategory === 'Tümü' ? null : this.selectedCategory,
        status: this.selectedStatus === 'all' ? null : this.selectedStatus,
        q: this.search.trim() === '' ? null : this.search.trim(),
        bookmarked: this.showBookmarkedOnly ? '1' : null
      }
    });
  }

  /** Clears filters and surfaces the words that are still unlearned. */
  reviewDifficultWords() {
    this.search = '';
    this.selectedLevel = 'Tümü';
    this.selectedCategory = 'Tümü';
    this.showBookmarkedOnly = false;
    this.selectedStatus = 'new';
    this.selectedSort = 'az';
    this.currentPage = 1;
    this.onFilterChange();
    this.writeStateToUrl();
  }

  exportList() {
    if (this.filteredWords.length === 0) {
      return;
    }

    const rows = [
      ['Kelime', 'Okunuş', 'Anlam', 'Seviye', 'Kategori', 'Öğrenildi', 'Kaydedildi'],
      ...this.filteredWords.map((word) => [
        word.word,
        word.phonetic,
        word.meaning,
        word.level,
        word.category,
        word.learned ? 'evet' : 'hayır',
        word.bookmarked ? 'evet' : 'hayır'
      ])
    ];

    // The BOM keeps Turkish characters readable when the file is opened in Excel.
    const csv = '﻿' + rows.map((row) => row.map((cell) => `"${(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kelime-listesi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  listen(word: VocabularyWord) {
    this.pronunciationService.play(word);
  }

  toggleLearned(word: VocabularyWord) {
    word.learned = !word.learned;
    this.onFilterChange();

    if (word.id) {
      void this.vocabularyDataService.saveProgress(word.id, { learned: word.learned }).catch((error) => {
        word.learned = !word.learned;
        this.onFilterChange();
        this.showProgressMessage(error instanceof AuthenticationRequiredError
          ? error.message
          : 'Öğrenildi bilgisi kaydedilemedi. Lütfen tekrar deneyin.');
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
          : 'Kaydedilenler güncellenemedi. Lütfen tekrar deneyin.');
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

  retryLoad() {
    void this.loadVocabulary();
  }

  private async loadVocabulary() {
    this.isLoading = true;
    this.loadError = '';

    try {
      const data = await this.vocabularyDataService.getWords();
      this.vocabulary = data;
    } catch (error) {
      console.error('Could not load vocabulary from Supabase. Falling back to sample data.', error);
      this.loadError = 'Kelimeler yüklenemedi. Örnek veriler gösteriliyor.';
      this.vocabulary = this.fallbackVocabulary;
    } finally {
      this.isLoading = false;
      const cats = new Set(this.vocabulary.map(item => item.category));
      this.categories = ['Tümü', ...Array.from(cats)].filter(c => c);
      // Counts sit next to each level in the rail and only change when the data reloads.
      this.levelCounts = this.vocabulary.reduce((counts, item) => {
        counts[item.level] = (counts[item.level] ?? 0) + 1;
        return counts;
      }, { 'Tümü': this.vocabulary.length } as Record<string, number>);
      this.onFilterChange();
    }
  }

  /** Restores filter state from the URL so back, refresh and sharing a link keep the selection. */
  private readStateFromUrl() {
    const params = this.route.snapshot.queryParamMap;
    const level = params.get('level');
    const category = params.get('category');
    const sort = params.get('sort');
    const q = params.get('q');

    const status = params.get('status');

    if (level && this.levels.includes(level)) this.selectedLevel = level;
    if (category) this.selectedCategory = category;
    if (sort && this.sortOptions.some(option => option.value === sort)) this.selectedSort = sort;
    if (status && this.statusOptions.some(option => option.value === status)) this.selectedStatus = status;
    if (q) this.search = q;
    this.showBookmarkedOnly = params.get('bookmarked') === '1';
  }

  /** Mirrors the current filter state into the query string, omitting defaults to keep the URL clean. */
  private writeStateToUrl() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        level: this.selectedLevel === 'Tümü' ? null : this.selectedLevel,
        category: this.selectedCategory === 'Tümü' ? null : this.selectedCategory,
        sort: this.selectedSort === 'az' ? null : this.selectedSort,
        status: this.selectedStatus === 'all' ? null : this.selectedStatus,
        q: this.search.trim() === '' ? null : this.search.trim(),
        bookmarked: this.showBookmarkedOnly ? '1' : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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
