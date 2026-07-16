import { Component } from '@angular/core';

interface WordItem {
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
export class ListViewComponent {
  title = 'Word Explorer';
  search = '';
  selectedCategory = 'All';
  selectedSort = 'A-Z';
  categories = ['All', 'Academic', 'Business', 'Daily'];
  sortOptions = ['A-Z', 'Learned', 'New'];

  vocabulary: WordItem[] = [
    { word: 'Inherent', phonetic: '/ɪnˈhɪər.ənt/', meaning: 'Doğasında olan, kalıtımsal', category: 'Academic', learned: true, bookmarked: true },
    { word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', category: 'Business', learned: false, bookmarked: false },
    { word: 'Ambiguous', phonetic: '/æmˈbɪɡ.ju.əs/', meaning: 'Belirsiz, muğlak', category: 'Academic', learned: false, bookmarked: false },
    { word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', category: 'Daily', learned: false, bookmarked: false },
    { word: 'Evaluate', phonetic: '/ɪnˈvæl.ju.eɪt/', meaning: 'Değerlendirmek', category: 'Academic', learned: true, bookmarked: false },
    { word: 'Collaborate', phonetic: '/kəˈlæb.ə.reɪt/', meaning: 'İşbirliği yapmak', category: 'Business', learned: false, bookmarked: true },
    { word: 'Constraint', phonetic: '/kənˈstreɪnt/', meaning: 'Kısıtlama, zorlama', category: 'Academic', learned: false, bookmarked: false }
  ];

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
  }

  toggleBookmark(word: WordItem) {
    word.bookmarked = !word.bookmarked;
  }
}
