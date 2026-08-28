import { Component, OnInit } from '@angular/core';
import { VocabularyDataService, VocabularyWord } from '../../../services/vocabulary-data.service';

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
  
  constructor(private vocabService: VocabularyDataService) {}

  async ngOnInit() {
    this.words = await this.vocabService.getWords();
    this.applyFilters();
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
