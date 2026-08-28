import { Component, OnInit } from '@angular/core';
import { VocabularyDataService } from '../../../services/vocabulary-data.service';

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css']
})
export class AdminAnalyticsComponent implements OnInit {
  totalWords: number = 0;
  learnedWords: number = 0;
  masteryRate: number = 0;

  constructor(private vocabService: VocabularyDataService) {}

  async ngOnInit() {
    const words = await this.vocabService.getWords();
    this.totalWords = words.length;
    this.learnedWords = words.filter(w => w.learned).length;
    if (this.totalWords > 0) {
      this.masteryRate = Math.round((this.learnedWords / this.totalWords) * 100);
    }
  }
}

