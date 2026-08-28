import { Component, OnInit } from '@angular/core';
import { AuthenticationRequiredError, VocabularyDataService, VocabularyWord } from '../../services/vocabulary-data.service';
import { PronunciationService } from '../../services/pronunciation.service';

@Component({
  selector: 'app-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.css']
})
export class ListViewComponent implements OnInit {
  title = 'Kelime Listesi';

  constructor(
    private vocabularyDataService: VocabularyDataService,
    private pronunciationService: PronunciationService
  ) {}
  search = '';
  selectedCategory = 'Tümü';
  /** Display labels are Turkish; the `value` keys stay stable for the sort logic. */
  selectedSort = 'az';
  sortOptions = [
    { value: 'az', label: 'A-Z' },
    { value: 'learned', label: 'Öğrenilenler' },
    { value: 'new', label: 'Yeniler' }
  ];
  showBookmarkedOnly = false;

  categories: string[] = ['Tümü'];
  filteredWords: VocabularyWord[] = [];
  
  currentTotal = 0;
  currentLearned = 0;
  currentMastery = 0;

  currentPage = 1;
  pageSize = 10;

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

  onFilterChange() {
    const term = this.search.trim().toLowerCase();
    let filtered = this.vocabulary.filter((item) => {
      const matchesCategory = this.selectedCategory === 'Tümü' || item.category === this.selectedCategory;
      const matchesSearch = term === '' || item.word.toLowerCase().includes(term) || item.meaning.toLowerCase().includes(term);
      const matchesBookmark = !this.showBookmarkedOnly || item.bookmarked;
      return matchesCategory && matchesSearch && matchesBookmark;
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
    this.currentPage = 1;
    this.onFilterChange();
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.onFilterChange();
  }

  setSort(option: string) {
    this.selectedSort = option;
    this.currentPage = 1;
    this.onFilterChange();
  }

  toggleBookmarkedOnly() {
    this.showBookmarkedOnly = !this.showBookmarkedOnly;
    this.currentPage = 1;
    this.onFilterChange();
  }

  /** Clears filters and surfaces the words that are still unlearned. */
  reviewDifficultWords() {
    this.search = '';
    this.selectedCategory = 'Tümü';
    this.showBookmarkedOnly = false;
    this.selectedSort = 'new';
    this.currentPage = 1;
    this.onFilterChange();
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
