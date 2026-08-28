import { Component, OnInit } from '@angular/core';
import { VocabularyDataService } from '../../../services/vocabulary-data.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  vocabularyCount: number = 0;
  avgMasteryRate: number = 0;

  constructor(private vocabService: VocabularyDataService) {}

  async ngOnInit() {
    const words = await this.vocabService.getWords();
    this.vocabularyCount = words.length;
    
    const learnedCount = words.filter(w => w.learned).length;
    if (this.vocabularyCount > 0) {
      this.avgMasteryRate = Math.round((learnedCount / this.vocabularyCount) * 100);
    }
  }
}

