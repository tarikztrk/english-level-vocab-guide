import { Component, OnInit } from '@angular/core';
import { VocabularyDataService, VocabularyWord } from '../../../services/vocabulary-data.service';

type WordFormModel = Omit<VocabularyWord, 'id' | 'learned' | 'bookmarked'>;

const EMPTY_FORM: WordFormModel = {
  word: '',
  phonetic: '',
  meaning: '',
  level: 'b1',
  category: 'academic',
  example: '',
  audioUrl: ''
};

@Component({
  selector: 'app-admin-vocabulary',
  templateUrl: './admin-vocabulary.component.html',
  styleUrls: ['./admin-vocabulary.component.css']
})
export class AdminVocabularyComponent implements OnInit {
  words: VocabularyWord[] = [];
  filteredWords: VocabularyWord[] = [];

  searchTerm: string = '';
  selectedLevel: string = '';
  selectedCategory: string = '';

  currentPage: number = 1;
  pageSize: number = 10;

  isModalOpen = false;
  editingWord: VocabularyWord | null = null;
  formModel: WordFormModel = { ...EMPTY_FORM };
  isSaving = false;
  errorMessage = '';

  constructor(private vocabService: VocabularyDataService) {}

  async ngOnInit() {
    this.words = await this.vocabService.getWords();
    this.applyFilters();
  }

  openAddModal() {
    this.editingWord = null;
    this.formModel = { ...EMPTY_FORM };
    this.errorMessage = '';
    this.isModalOpen = true;
  }

  openEditModal(word: VocabularyWord) {
    this.editingWord = word;
    this.formModel = {
      word: word.word,
      phonetic: word.phonetic,
      meaning: word.meaning,
      level: word.level,
      category: word.category,
      example: word.example,
      audioUrl: word.audioUrl
    };
    this.errorMessage = '';
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  async saveWord() {
    if (!this.formModel.word.trim() || !this.formModel.meaning.trim()) {
      this.errorMessage = 'Word and meaning are required.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    try {
      if (this.editingWord) {
        const updated = await this.vocabService.updateWord(this.editingWord.id, this.formModel);
        this.words = this.words.map((w) => (w.id === updated.id ? updated : w));
      } else {
        const created = await this.vocabService.createWord(this.formModel);
        this.words = [...this.words, created];
      }

      this.applyFilters();
      this.isModalOpen = false;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Could not save this word.';
    } finally {
      this.isSaving = false;
    }
  }

  async deleteWord(word: VocabularyWord) {
    const confirmed = confirm(`Delete "${word.word}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      await this.vocabService.deleteWord(word.id);
      this.words = this.words.filter((w) => w.id !== word.id);
      this.applyFilters();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete this word.');
    }
  }
  
  applyFilters() {
    this.filteredWords = this.words.filter(word => {
      const matchSearch = word.word.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                          word.meaning.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchLevel = this.selectedLevel ? word.level.toLowerCase() === this.selectedLevel.toLowerCase() : true;
      const matchCategory = this.selectedCategory ? word.category.toLowerCase() === this.selectedCategory.toLowerCase() : true;
      return matchSearch && matchLevel && matchCategory;
    });
    this.currentPage = 1;
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
  
  getVisiblePages(): number[] {
    // Simple logic: return up to 5 pages around current page
    let pages = [];
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, this.currentPage + 2);
    for(let i=start; i<=end; i++) {
        pages.push(i);
    }
    return pages;
  }
}
