import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationRequiredError, VocabularyDataService, VocabularyWord } from '../../services/vocabulary-data.service';
import { PronunciationService } from '../../services/pronunciation.service';
import { levelBadgeStyle } from '../../shared/level-badge';
import { CEFR_LEVELS, LEVEL_NAMES, levelTitle } from '../../shared/levels';

interface LevelStat {
  code: string;
  name: string;
  total: number;
  learned: number;
  percent: number;
}

const RECENT_WORD_COUNT = 3;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  title = 'EnglishAcademy';

  readonly levelBadgeStyle = levelBadgeStyle;

  constructor(
    private vocabularyDataService: VocabularyDataService,
    private pronunciationService: PronunciationService,
    private router: Router
  ) {}

  isLoading = true;
  loadError = '';
  progressMessage = '';
  private progressMessageTimeout?: ReturnType<typeof setTimeout>;

  vocabularyItems: VocabularyWord[] = [];
  levelStats: LevelStat[] = [];
  /** The level the hero speaks for: where the user left off, or the first unfinished one. */
  currentLevel = 'A1';
  recentWords: VocabularyWord[] = [];
  wordOfTheDay: VocabularyWord | null = null;

  private readonly fallbackVocabulary: VocabularyWord[] = [
    { id: 1, word: 'Inherent', phonetic: '/ɪnˈhɪər.ənt/', meaning: 'Doğasında olan, kalıtımsal', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 2, word: 'Abstract', phonetic: '/ˈæb.strækt/', meaning: 'Soyut, özet', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: true, bookmarked: false },
    { id: 3, word: 'Negotiate', phonetic: '/nɪˈɡoʊ.ʃi.eɪt/', meaning: 'Görüşmek, pazarlık yapmak', level: 'B2', category: 'Business', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 4, word: 'Everyday', phonetic: '/ˈɛv.ri.deɪ/', meaning: 'Günlük', level: 'A2', category: 'Daily', example: '', audioUrl: '', learned: false, bookmarked: false },
    { id: 5, word: 'Evaluate', phonetic: '/ɪˈvæl.ju.eɪt/', meaning: 'Değerlendirmek', level: 'B1', category: 'Academic', example: '', audioUrl: '', learned: false, bookmarked: false }
  ].map((word) => ({ ...word, wordType: '', status: 'published' as const, updatedAt: '', updatedByEmail: '' }));

  ngOnInit() {
    void this.loadVocabulary();
  }

  // ---------- hero ----------

  get currentLevelTitle(): string {
    return levelTitle(this.currentLevel);
  }

  get currentLevelStat(): LevelStat {
    return this.levelStats.find((stat) => stat.code === this.currentLevel)
      ?? { code: this.currentLevel, name: LEVEL_NAMES[this.currentLevel] ?? '', total: 0, learned: 0, percent: 0 };
  }

  get remainingInCurrentLevel(): number {
    const stat = this.currentLevelStat;
    return Math.max(stat.total - stat.learned, 0);
  }

  /** Dash offset for the hero ring: circumference 2πr with r = 74. */
  get ringDashOffset(): number {
    const circumference = 2 * Math.PI * 74;
    return circumference * (1 - this.currentLevelStat.percent / 100);
  }

  get ringCircumference(): number {
    return 2 * Math.PI * 74;
  }

  selectLevel(code: string) {
    this.currentLevel = code;
  }

  /** Primary action: study exactly what is left in this level. */
  continueStudying() {
    void this.router.navigate(['/flashcards'], {
      queryParams: { level: this.currentLevel, status: this.remainingInCurrentLevel > 0 ? 'new' : null }
    });
  }

  openCurrentLevelList() {
    void this.router.navigate(['/list'], { queryParams: { level: this.currentLevel } });
  }

  // ---------- word actions ----------

  listen(item: VocabularyWord) {
    this.pronunciationService.play(item);
  }

  toggleLearned(item: VocabularyWord) {
    item.learned = !item.learned;
    this.recomputeStats();

    if (item.id) {
      void this.vocabularyDataService.saveProgress(item.id, { learned: item.learned }).catch((error) => {
        item.learned = !item.learned;
        this.recomputeStats();
        this.showProgressMessage(error instanceof AuthenticationRequiredError
          ? error.message
          : 'İlerleme kaydedilemedi. Lütfen tekrar deneyin.');
        console.error('Could not save vocabulary progress', error);
      });
    }
  }

  toggleBookmark(item: VocabularyWord) {
    item.bookmarked = !item.bookmarked;

    if (item.id) {
      void this.vocabularyDataService.saveProgress(item.id, { bookmarked: item.bookmarked }).catch((error) => {
        item.bookmarked = !item.bookmarked;
        this.showProgressMessage(error instanceof AuthenticationRequiredError
          ? error.message
          : 'Kaydedilenler güncellenemedi. Lütfen tekrar deneyin.');
        console.error('Could not save bookmark state', error);
      });
    }
  }

  dismissProgressMessage() {
    this.progressMessage = '';

    if (this.progressMessageTimeout) {
      clearTimeout(this.progressMessageTimeout);
    }
  }

  // ---------- loading ----------

  private async loadVocabulary() {
    this.isLoading = true;
    this.loadError = '';

    try {
      this.vocabularyItems = await this.vocabularyDataService.getWords();
    } catch (error) {
      console.error('Could not load vocabulary from Supabase. Falling back to sample data.', error);
      this.loadError = 'Kelimeler yüklenemedi. Örnek veriler gösteriliyor.';
      this.vocabularyItems = this.fallbackVocabulary;
    }

    this.recomputeStats();
    this.wordOfTheDay = this.pickWordOfTheDay();
    await this.loadRecentWords();
    this.isLoading = false;
  }

  /**
   * "Where you left off" is the level of the most recently touched word; with no
   * progress yet it falls back to the first level that still has words to learn.
   */
  private async loadRecentWords() {
    let recentIds: number[] = [];

    try {
      recentIds = await this.vocabularyDataService.getRecentlyStudiedWordIds(12);
    } catch (error) {
      // The home screen still works without history; the hero just falls back.
      console.error('Could not load recent progress', error);
    }

    const byId = new Map(this.vocabularyItems.map((item) => [item.id, item]));
    this.recentWords = recentIds
      .map((id) => byId.get(id))
      .filter((item): item is VocabularyWord => !!item)
      .slice(0, RECENT_WORD_COUNT);

    this.currentLevel = this.recentWords[0]?.level ?? this.firstUnfinishedLevel();
  }

  private firstUnfinishedLevel(): string {
    const unfinished = this.levelStats.find((stat) => stat.total > 0 && stat.learned < stat.total);
    const anyWithWords = this.levelStats.find((stat) => stat.total > 0);
    return unfinished?.code ?? anyWithWords?.code ?? CEFR_LEVELS[0];
  }

  private recomputeStats() {
    this.levelStats = CEFR_LEVELS.map((code) => {
      const words = this.vocabularyItems.filter((item) => item.level === code);
      const learned = words.filter((item) => item.learned).length;
      return {
        code,
        name: LEVEL_NAMES[code],
        total: words.length,
        learned,
        percent: words.length > 0 ? Math.round((learned / words.length) * 100) : 0
      };
    });
  }

  /**
   * Picks a stable word for the current calendar day so the card does not
   * change on every reload but still rotates daily.
   */
  private pickWordOfTheDay(): VocabularyWord | null {
    if (this.vocabularyItems.length === 0) {
      return null;
    }

    const startOfYear = new Date(new Date().getFullYear(), 0, 0);
    const dayOfYear = Math.floor((Date.now() - startOfYear.getTime()) / 86400000);
    return this.vocabularyItems[dayOfYear % this.vocabularyItems.length];
  }

  private showProgressMessage(message: string) {
    this.progressMessage = message;

    if (this.progressMessageTimeout) {
      clearTimeout(this.progressMessageTimeout);
    }

    this.progressMessageTimeout = setTimeout(() => {
      this.progressMessage = '';
    }, 4000);
  }
}
