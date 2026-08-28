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
  learned: boolean;
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
      learned: false,
    },
    {
      id: 2,
      front: "Negotiate",
      back: "Görüşmek, pazarlık yapmak",
      category: "Business",
      pronunciation: "/nɪˈɡoʊ.ʃi.eɪt/",
      example: "They agreed to negotiate the contract terms next week.",
      audioUrl: "",
      learned: false,
    },
    {
      id: 3,
      front: "Ambiguous",
      back: "Belirsiz, muğlak",
      category: "Academic",
      pronunciation: "/æmˈbɪɡ.ju.əs/",
      example: "His answer was deliberately ambiguous.",
      audioUrl: "",
      learned: false,
    },
    {
      id: 4,
      front: "Everyday",
      back: "Günlük",
      category: "Daily",
      pronunciation: "/ˈɛv.ri.deɪ/",
      example: "I wear these shoes for everyday use.",
      audioUrl: "",
      learned: false,
    },
    {
      id: 5,
      front: "Collaborate",
      back: "İşbirliği yapmak",
      category: "Business",
      pronunciation: "/kəˈlæb.ə.reɪt/",
      example: "They collaborate on several international projects.",
      audioUrl: "",
      learned: false,
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
    const card = this.currentCard;
    if (!card) return;

    if (card.audioUrl) {
      new Audio(card.audioUrl).play().catch((error) => {
        console.error("Could not play audio file", error);
        this.speak(card.front);
      });
      return;
    }

    this.speak(card.front);
  }

  toggleLearned(card: Flashcard) {
    card.learned = !card.learned;

    if (card.id) {
      void this.vocabularyDataService
        .saveProgress(card.id, { learned: card.learned })
        .catch((error) => {
          card.learned = !card.learned;
          this.showProgressMessage(
            error instanceof AuthenticationRequiredError
              ? error.message
              : "Could not save learned state. Please try again.",
          );
          console.error("Could not save learned state", error);
        });
    }
  }

  private speak(text: string) {
    if (!("speechSynthesis" in window)) {
      this.showProgressMessage("Audio playback is not supported in this browser.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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
              learned: item.learned,
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
