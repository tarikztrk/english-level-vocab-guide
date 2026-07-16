import { Component } from '@angular/core';

interface Flashcard {
  front: string;
  back: string;
  category: string;
  pronunciation: string;
}

@Component({
  selector: 'app-flashcards',
  templateUrl: './flashcards.component.html',
  styleUrls: ['./flashcards.component.css']
})
export class FlashcardsComponent {
  title = 'Flashcards';
  cards: Flashcard[] = [
    { front: 'Inherent', back: 'Doğasında olan, kalıtımsal', category: 'Academic', pronunciation: '/ɪnˈhɪər.ənt/' },
    { front: 'Negotiate', back: 'Görüşmek, pazarlık yapmak', category: 'Business', pronunciation: '/nɪˈɡoʊ.ʃi.eɪt/' },
    { front: 'Ambiguous', back: 'Belirsiz, muğlak', category: 'Academic', pronunciation: '/æmˈbɪɡ.ju.əs/' },
    { front: 'Everyday', back: 'Günlük', category: 'Daily', pronunciation: '/ˈɛv.ri.deɪ/' },
    { front: 'Collaborate', back: 'İşbirliği yapmak', category: 'Business', pronunciation: '/kəˈlæb.ə.reɪt/' }
  ];
  currentIndex = 0;
  isFlipped = false;

  get currentCard() {
    return this.cards[this.currentIndex];
  }

  get progressLabel() {
    return `${this.currentIndex + 1} / ${this.cards.length}`;
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
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
}
