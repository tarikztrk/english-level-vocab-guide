import { Component, OnInit } from '@angular/core';
import { VocabularyDataService, VocabularyWord } from '../../services/vocabulary-data.service';

interface Flashcard {
  front: string;
  back: string;
  category: string;
  pronunciation: string;
  example: string;
  audioUrl?: string;
}

@Component({
  selector: 'app-flashcards',
  templateUrl: './flashcards.component.html',
  styleUrls: ['./flashcards.component.css']
})
export class FlashcardsComponent implements OnInit {
  title = 'Flashcards';
  cards: Flashcard[] = [];

  constructor(private vocabularyDataService: VocabularyDataService) {}

  private readonly fallbackCards: Flashcard[] = [
    { front: 'Inherent', back: 'Doğasında olan, kalıtımsal', category: 'Academic', pronunciation: '/ɪnˈhɪər.ənt/', example: 'The risks inherent in the investment were carefully weighed.', audioUrl: '' },
    { front: 'Negotiate', back: 'Görüşmek, pazarlık yapmak', category: 'Business', pronunciation: '/nɪˈɡoʊ.ʃi.eɪt/', example: 'They agreed to negotiate the contract terms next week.', audioUrl: '' },
    { front: 'Ambiguous', back: 'Belirsiz, muğlak', category: 'Academic', pronunciation: '/æmˈbɪɡ.ju.əs/', example: 'His answer was deliberately ambiguous.', audioUrl: '' },
    { front: 'Everyday', back: 'Günlük', category: 'Daily', pronunciation: '/ˈɛv.ri.deɪ/', example: 'I wear these shoes for everyday use.', audioUrl: '' },
    { front: 'Collaborate', back: 'İşbirliği yapmak', category: 'Business', pronunciation: '/kəˈlæb.ə.reɪt/', example: 'They collaborate on several international projects.', audioUrl: '' }
  ];
  currentIndex = 0;
  isFlipped = false;

  ngOnInit() {
    void this.loadCards();
  }

  get currentCard() {
    return this.cards[this.currentIndex];
  }

  get progressLabel() {
    return `${this.currentIndex + 1} / ${this.cards.length}`;
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  listenToPronunciation() {
    // Placeholder for future audio playback integration.
    console.log(`Listen to ${this.currentCard.front}: ${this.currentCard.pronunciation}`);
  }

  nextCard() {
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.isFlipped = false;
  }

  prevCard() {
    this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
    this.isFlipped = false;
  }

  goToCard(index: number) {
    this.currentIndex = index;
    this.isFlipped = false;
  }

  private async loadCards() {
    try {
      const data = await this.vocabularyDataService.getWords();
      this.cards = Array.isArray(data) && data.length > 0
        ? data.map((item: VocabularyWord) => ({
            front: item.word ?? '',
            back: item.meaning ?? '',
            category: item.category ?? 'Academic',
            pronunciation: item.phonetic ?? '',
            example: item.example ?? `Example for ${item.word ?? 'this word'}`,
            audioUrl: item.audioUrl ?? ''
          }))
        : this.fallbackCards;
    } catch (error) {
      console.error('Could not load flashcards from Supabase. Falling back to sample data.', error);
      this.cards = this.fallbackCards;
    }
  }
}
