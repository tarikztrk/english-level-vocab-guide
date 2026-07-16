import { Component } from '@angular/core';

interface VocabularyCard {
  word: string;
  phonetic: string;
  meaning: string;
  category: string;
  level: string;
}

@Component({
  selector: 'app-vocabulary',
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.css']
})
export class VocabularyComponent {
  title = 'Vocabulary Explorer';
  search = '';
  selectedCategory = 'All';
  categories = ['All', 'Academic', 'Business', 'Daily'];

  vocabulary: VocabularyCard[] = [
    { word: 'Acknowledge', phonetic: '/əkˈnɒl.ɪdʒ/', meaning: 'Kabul etmek, onaylamak', category: 'Academic', level: 'B1' },
    { word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', category: 'Business', level: 'B2' },
    { word: 'Facilitate', phonetic: '/fəˈsɪl.ɪ.teɪt/', meaning: 'Kolaylaştırmak', category: 'Academic', level: 'B1' },
    { word: 'Collaborate', phonetic: '/kəˈlæb.ə.reɪt/', meaning: 'İşbirliği yapmak', category: 'Business', level: 'B2' },
    { word: 'Constraint', phonetic: '/kənˈstreɪnt/', meaning: 'Kısıtlama, zorlama', category: 'Academic', level: 'B2' },
    { word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', category: 'Daily', level: 'A2' }
  ];

  get filteredVocabulary() {
    const query = this.search.trim().toLowerCase();
    return this.vocabulary.filter((item) => {
      const matchesCategory = this.selectedCategory === 'All' || item.category === this.selectedCategory;
      const matchesSearch = query.length === 0 || item.word.toLowerCase().includes(query) || item.meaning.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }
}
