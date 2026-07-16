import { Component } from '@angular/core';

interface LevelTab {
  label: string;
  active: boolean;
}

interface VocabularyItem {
  word: string;
  phonetic: string;
  meaning: string;
  level: string;
  category: string;
  learned: boolean;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  title = 'LexiLearn';

  tabs: LevelTab[] = [
    { label: 'A1', active: false },
    { label: 'A2', active: false },
    { label: 'B1', active: true },
    { label: 'B2', active: false },
    { label: 'C1', active: false },
    { label: 'C2', active: false }
  ];

  categories = ['All', 'Academic', 'Business', 'Daily'];
  selectedCategory = 'All';
  search = '';

  stats = [
    { label: 'Overall Mastery', value: '65%', accent: 'text-primary' },
    { label: 'Today', value: '12' },
    { label: 'Total', value: '420', accent: 'text-secondary' }
  ];

  quickActions = [
    { title: 'Flashcards', description: 'Review 10 words in 5 minutes', icon: 'view_carousel' },
    { title: 'Listening', description: 'Hear native pronunciation', icon: 'volume_up' },
    { title: 'Practice Quiz', description: 'Test your recall instantly', icon: 'quiz' }
  ];

  vocabularyItems: VocabularyItem[] = [
    { word: 'Inherent', phonetic: '/ɪnˈhɪər.ənt/', meaning: 'Doğasında olan, kalıtımsal', level: 'B1', category: 'Academic', learned: false },
    { word: 'Abstract', phonetic: '/ˈæb.strækt/', meaning: 'Soyut, özet', level: 'B1', category: 'Academic', learned: true },
    { word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', level: 'B2', category: 'Business', learned: false },
    { word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', level: 'A2', category: 'Daily', learned: false },
    { word: 'Evaluate', phonetic: '/ɪˈvæl.ju.eɪt/', meaning: 'Değerlendirmek', level: 'B1', category: 'Academic', learned: false }
  ];

  get filteredVocabulary() {
    return this.vocabularyItems.filter((item) => {
      const matchesCategory = this.selectedCategory === 'All' || item.category === this.selectedCategory;
      const matchesSearch = this.search.trim().length === 0 || item.word.toLowerCase().includes(this.search.toLowerCase()) || item.meaning.toLowerCase().includes(this.search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  selectTab(label: string) {
    this.tabs = this.tabs.map((tab) => ({ ...tab, active: tab.label === label }));
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  toggleLearned(item: VocabularyItem) {
    item.learned = !item.learned;
  }
}
