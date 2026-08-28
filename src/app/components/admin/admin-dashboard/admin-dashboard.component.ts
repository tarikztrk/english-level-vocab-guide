import { Component, OnInit } from '@angular/core';
import { AdminStats, AdminStatsService } from '../../../services/admin-stats.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminStats | null = null;
  isLoading = true;
  loadError = '';

  constructor(private adminStatsService: AdminStatsService) {}

  async ngOnInit() {
    try {
      this.stats = await this.adminStatsService.getStats();
    } catch (error) {
      console.error('Could not load admin dashboard stats', error);
      this.loadError = 'Could not load dashboard data.';
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

  get lowestCoverageLevel(): { level: string; count: number } | null {
    if (!this.stats || this.stats.levelDistribution.length === 0) return null;
    return this.stats.levelDistribution.reduce((lowest, current) => (current.count < lowest.count ? current : lowest));
  }
}
