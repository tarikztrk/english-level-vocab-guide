import { Component, OnInit } from '@angular/core';
import { VocabularyDataService } from '../../../services/vocabulary-data.service';

interface ChangeLogEntry {
  id: number;
  wordId: number | null;
  wordLabel: string;
  action: string;
  changedByEmail: string;
  changedAt: string;
  details: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'oluşturdu',
  update: 'düzenledi',
  publish: 'yayınladı',
  archive: 'arşivledi',
  restore: 'geri aldı',
  import: 'içe aktardı'
};

@Component({
  selector: 'app-admin-changelog',
  templateUrl: './admin-changelog.component.html',
  styleUrls: ['./admin-changelog.component.css']
})
export class AdminChangelogComponent implements OnInit {
  entries: ChangeLogEntry[] = [];
  isLoading = true;
  loadError = '';

  constructor(private vocabService: VocabularyDataService) {}

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    this.isLoading = true;
    this.loadError = '';

    try {
      this.entries = await this.vocabService.getRecentChanges();
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : 'Günlük yüklenemedi.';
    } finally {
      this.isLoading = false;
    }
  }

  actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
  }
}
