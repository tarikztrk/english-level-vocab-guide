import { Component, OnInit } from '@angular/core';
import { AdminStats, AdminStatsService } from '../../../services/admin-stats.service';

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css']
})
export class AdminAnalyticsComponent implements OnInit {
  stats: AdminStats | null = null;
  isLoading = true;
  loadError = '';

  constructor(private adminStatsService: AdminStatsService) {}

  async ngOnInit() {
    try {
      this.stats = await this.adminStatsService.getStats();
    } catch (error) {
      console.error('Could not load admin analytics', error);
      this.loadError = 'Could not load analytics data.';
    } finally {
      this.isLoading = false;
    }
  }

  get maxDailyActive(): number {
    if (!this.stats || this.stats.dailyActive.length === 0) return 1;
    return Math.max(1, ...this.stats.dailyActive.map((d) => d.count));
  }

  formatDay(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  }

  initials(email: string): string {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  }

  exportTopLearners() {
    if (!this.stats || this.stats.topLearners.length === 0) return;

    const rows = [
      ['Email', 'Words Learned', 'Mastery %'],
      ...this.stats.topLearners.map((learner) => [learner.email, String(learner.learnedCount), String(learner.masteryPercent)])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'top-learners.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
