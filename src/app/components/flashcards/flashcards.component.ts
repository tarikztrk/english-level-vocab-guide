import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  AuthenticationRequiredError,
  VocabularyDataService,
  VocabularyWord,
} from "../../services/vocabulary-data.service";
import { PronunciationService } from "../../services/pronunciation.service";
import { levelBadgeStyle } from "../../shared/level-badge";
import { normalizeForSearch } from "../../shared/text";
import { LEVEL_NAMES } from "../../shared/levels";

interface Flashcard {
  id?: number;
  front: string;
  back: string;
  category: string;
  level: string;
  pronunciation: string;
  example: string;
  audioUrl?: string;
  learned: boolean;
  bookmarked: boolean;
}

/** Deck scope handed over from the list view via the query string. */
interface DeckFilter {
  level: string;
  category: string;
  status: string;
  search: string;
  bookmarkedOnly: boolean;
}

@Component({
  selector: "app-flashcards",
  templateUrl: "./flashcards.component.html",
  styleUrls: ["./flashcards.component.css"],
})
export class FlashcardsComponent implements OnInit {
  title = "Bilgi Kartları";
  cards: Flashcard[] = [];
  isLoading = true;
  loadError = "";
  progressMessage = "";
  private progressMessageTimeout?: ReturnType<typeof setTimeout>;

  readonly levelBadgeStyle = levelBadgeStyle;

  /** Empty filter = the whole published vocabulary. */
  deckFilter: DeckFilter = { level: "", category: "", status: "", search: "", bookmarkedOnly: false };
  /** Cards set aside with "Tekrar et" during this session, shown as a session counter. */
  reviewCount = 0;

  constructor(
    private vocabularyDataService: VocabularyDataService,
    private pronunciationService: PronunciationService,
    private route: ActivatedRoute,
  ) {}

  private readonly fallbackCards: Flashcard[] = [
    {
      id: 1,
      front: "Inherent",
      back: "Doğasında olan, kalıtımsal",
      category: "Academic",
      level: "C1",
      pronunciation: "/ɪnˈhɪər.ənt/",
      example: "The risks inherent in the investment were carefully weighed.",
      audioUrl: "",
      learned: false,
      bookmarked: false,
    },
    {
      id: 2,
      front: "Negotiate",
      back: "Görüşmek, pazarlık yapmak",
      category: "Business",
      level: "B1",
      pronunciation: "/nɪˈɡoʊ.ʃi.eɪt/",
      example: "They agreed to negotiate the contract terms next week.",
      audioUrl: "",
      learned: false,
      bookmarked: false,
    },
    {
      id: 3,
      front: "Ambiguous",
      back: "Belirsiz, muğlak",
      category: "Academic",
      level: "C1",
      pronunciation: "/æmˈbɪɡ.ju.əs/",
      example: "His answer was deliberately ambiguous.",
      audioUrl: "",
      learned: false,
      bookmarked: false,
    },
    {
      id: 4,
      front: "Everyday",
      back: "Günlük",
      category: "Daily",
      level: "A2",
      pronunciation: "/ˈɛv.ri.deɪ/",
      example: "I wear these shoes for everyday use.",
      audioUrl: "",
      learned: false,
      bookmarked: false,
    },
    {
      id: 5,
      front: "Collaborate",
      back: "İşbirliği yapmak",
      category: "Business",
      level: "B1",
      pronunciation: "/kəˈlæb.ə.reɪt/",
      example: "They collaborate on several international projects.",
      audioUrl: "",
      learned: false,
      bookmarked: false,
    },
  ];
  currentIndex = 0;
  isFlipped = false;

  ngOnInit() {
    this.readDeckFilterFromUrl();
    void this.loadCards();
  }

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      return;
    }
    if (!this.currentCard) {
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      this.flipCard();
    } else if (event.key === "ArrowRight") {
      this.nextCard();
    } else if (event.key === "ArrowLeft") {
      this.prevCard();
    }
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

  get learnedCount(): number {
    return this.cards.filter((card) => card.learned).length;
  }

  get learnedPercent(): number {
    return this.cards.length === 0 ? 0 : Math.round((this.learnedCount / this.cards.length) * 100);
  }

  /** Human-readable description of what this deck actually contains. */
  get deckLabel(): string {
    const parts: string[] = [];
    if (this.deckFilter.level) {
      const name = LEVEL_NAMES[this.deckFilter.level];
      parts.push(name ? `${this.deckFilter.level} · ${name}` : this.deckFilter.level);
    }
    if (this.deckFilter.category) parts.push(this.deckFilter.category);
    if (this.deckFilter.status === "learned") parts.push("öğrenilenler");
    if (this.deckFilter.status === "new") parts.push("öğrenilmemişler");
    if (this.deckFilter.bookmarkedOnly) parts.push("kaydedilenler");
    if (this.deckFilter.search) parts.push(`“${this.deckFilter.search}”`);
    return parts.length > 0 ? parts.join(" · ") : "Tüm kelimeler";
  }

  get isFilteredDeck(): boolean {
    const f = this.deckFilter;
    return !!(f.level || f.category || f.status || f.search || f.bookmarkedOnly);
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  listenToPronunciation() {
    if (!this.currentCard) return;
    this.pronunciationService.play({ word: this.currentCard.front, audioUrl: this.currentCard.audioUrl });
  }

  /** "Biliyorum": marks the card learned and moves on. */
  markKnown() {
    const card = this.currentCard;
    if (!card) return;

    if (!card.learned) {
      this.toggleLearned(card);
    }
    this.nextCard();
  }

  /** "Tekrar et": leaves the card unlearned and sends it to the back of the deck. */
  markForReview() {
    const card = this.currentCard;
    if (!card) return;

    this.reviewCount++;

    if (this.cards.length < 2) {
      this.isFlipped = false;
      return;
    }

    const wasLast = this.currentIndex === this.cards.length - 1;
    this.cards.splice(this.currentIndex, 1);
    this.cards.push(card);
    if (wasLast) {
      this.currentIndex = 0;
    }
    this.isFlipped = false;
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
              : "Öğrenildi bilgisi kaydedilemedi. Lütfen tekrar deneyin.",
          );
          console.error("Could not save learned state", error);
        });
    }
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

  dismissProgressMessage() {
    this.progressMessage = "";

    if (this.progressMessageTimeout) {
      clearTimeout(this.progressMessageTimeout);
    }
  }

  private readDeckFilterFromUrl() {
    const params = this.route.snapshot.queryParamMap;
    this.deckFilter = {
      level: params.get("level") ?? "",
      category: params.get("category") ?? "",
      status: params.get("status") ?? "",
      search: params.get("q") ?? "",
      bookmarkedOnly: params.get("bookmarked") === "1",
    };
  }

  private matchesDeckFilter(word: VocabularyWord): boolean {
    const f = this.deckFilter;
    const term = normalizeForSearch(f.search.trim());

    const matchesLevel = !f.level || word.level === f.level;
    const matchesCategory = !f.category || word.category === f.category;
    const matchesStatus = !f.status || (f.status === "learned" ? word.learned : !word.learned);
    const matchesBookmark = !f.bookmarkedOnly || word.bookmarked;
    const matchesSearch =
      term === "" ||
      normalizeForSearch(word.word).includes(term) ||
      normalizeForSearch(word.meaning).includes(term);

    return matchesLevel && matchesCategory && matchesStatus && matchesBookmark && matchesSearch;
  }

  private async loadCards() {
    this.isLoading = true;
    this.loadError = "";

    try {
      const data = await this.vocabularyDataService.getWords();
      this.cards =
        Array.isArray(data) && data.length > 0
          ? data.filter((item) => this.matchesDeckFilter(item)).map((item: VocabularyWord) => ({
              id: item.id,
              front: item.word,
              back: item.meaning,
              category: item.category,
              level: item.level,
              pronunciation: item.phonetic,
              example: item.example || `${item.word} için örnek cümle eklenmemiş.`,
              audioUrl: item.audioUrl,
              learned: item.learned,
              bookmarked: item.bookmarked,
            }))
          : this.fallbackCards;
    } catch (error) {
      console.error(
        "Could not load flashcards from Supabase. Falling back to sample data.",
        error,
      );
      this.loadError = "Kartlar yüklenemedi. Örnek veriler gösteriliyor.";
      this.cards = this.fallbackCards;
    } finally {
      this.isLoading = false;
      this.currentIndex = 0;
      this.isFlipped = false;
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
