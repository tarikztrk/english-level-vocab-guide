import { Component, OnInit } from "@angular/core";
import {
  AuthenticationRequiredError,
  VocabularyDataService,
  VocabularyWord,
} from "../../services/vocabulary-data.service";

interface Flashcard {
  id?: number;
  front: string;
  back: string;
  category: string;
  pronunciation: string;
  example: string;
  audioUrl?: string;
}

@Component({
  selector: "app-flashcards",
  templateUrl: "./flashcards.component.html",
  styleUrls: ["./flashcards.component.css"],
})
export class FlashcardsComponent implements OnInit {
  title = "Flashcards";
  cards: Flashcard[] = [];
  isLoading = true;
  loadError = "";
  progressMessage = "";
  private progressMessageTimeout?: ReturnType<typeof setTimeout>;

  constructor(private vocabularyDataService: VocabularyDataService) {}

  private readonly fallbackCards: Flashcard[] = [
    {
      id: 1,
      front: "Inherent",
      back: "Doğasında olan, kalıtımsal",
      category: "Academic",
      pronunciation: "/ɪnˈhɪər.ənt/",
      example: "The risks inherent in the investment were carefully weighed.",
      audioUrl: "",
    },
    {
      id: 2,
      front: "Negotiate",
      back: "Görüşmek, pazarlık yapmak",
      category: "Business",
      pronunciation: "/nɪˈɡoʊ.ʃi.eɪt/",
      example: "They agreed to negotiate the contract terms next week.",
      audioUrl: "",
    },
    {
      id: 3,
      front: "Ambiguous",
      back: "Belirsiz, muğlak",
      category: "Academic",
      pronunciation: "/æmˈbɪɡ.ju.əs/",
      example: "His answer was deliberately ambiguous.",
      audioUrl: "",
    },
    {
      id: 4,
      front: "Everyday",
      back: "Günlük",
      category: "Daily",
      pronunciation: "/ˈɛv.ri.deɪ/",
      example: "I wear these shoes for everyday use.",
      audioUrl: "",
    },
    {
      id: 5,
      front: "Collaborate",
      back: "İşbirliği yapmak",
      category: "Business",
      pronunciation: "/kəˈlæb.ə.reɪt/",
      example: "They collaborate on several international projects.",
      audioUrl: "",
    },
  ];
  currentIndex = 0;
  isFlipped = false;

  ngOnInit() {
    void this.loadCards();
  }

  get currentCard(): Flashcard | undefined {
    return this.cards[this.currentIndex];
  }

  get progressLabel() {
    if (this.cards.length === 0) {
      return "0 / 0";
    }
    return `${this.currentIndex + 1} / ${this.cards.length}`;
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  listenToPronunciation() {
    if (!this.currentCard) return;
    // Placeholder for future audio playback integration.
    console.log(
      `Listen to ${this.currentCard.front}: ${this.currentCard.pronunciation}`,
    );
  }

  nextCard() {
    if (this.cards.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.isFlipped = false;
  }

  prevCard() {
    if (this.cards.length === 0) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.cards.length) % this.cards.length;
    this.isFlipped = false;
  }

  goToCard(index: number) {
    this.currentIndex = index;
    this.isFlipped = false;
  }

  dismissProgressMessage() {
    this.progressMessage = "";

    if (this.progressMessageTimeout) {
      clearTimeout(this.progressMessageTimeout);
    }
  }

  private async loadCards() {
    this.isLoading = true;
    this.loadError = "";

    try {
      const data = await this.vocabularyDataService.getWords();
      this.cards =
        Array.isArray(data) && data.length > 0
          ? data.map((item: VocabularyWord) => ({
              id: item.id,
              front: item.word,
              back: item.meaning,
              category: item.category,
              pronunciation: item.phonetic,
              example: item.example || `Example for ${item.word}`,
              audioUrl: item.audioUrl,
            }))
          : this.fallbackCards;
    } catch (error) {
      console.error(
        "Could not load flashcards from Supabase. Falling back to sample data.",
        error,
      );
      this.loadError = "Could not load flashcards. Showing sample data.";
      this.cards = this.fallbackCards;
    } finally {
      this.isLoading = false;
    }
  }

  private showProgressMessage(message: string) {
    this.progressMessage = message;

    if (this.progressMessageTimeout) {
      clearTimeout(this.progressMessageTimeout);
    }

    this.progressMessageTimeout = setTimeout(() => {
      this.progressMessage = "";
    }, 4000);
  }
}
