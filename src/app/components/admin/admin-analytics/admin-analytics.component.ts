import { Component, OnInit } from '@angular/core';
import { AdminStats, AdminStatsService, StudentRow } from '../../../services/admin-stats.service';

type StudentSortKey = 'learned' | 'lastActive' | 'email';

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
      this.loadError = 'Analiz verileri yüklenemedi.';
    } finally {
      this.isLoading = false;
    }
  }

  sortKey: StudentSortKey = 'learned';
  readonly sortOptions: { key: StudentSortKey; label: string }[] = [
    { key: 'learned', label: 'Öğrenilen' },
    { key: 'lastActive', label: 'Sessizlik' },
    { key: 'email', label: 'E-posta' }
  ];

  get maxDailyActive(): number {
    if (!this.stats || this.stats.dailyActive.length === 0) return 1;
    return Math.max(1, ...this.stats.dailyActive.map((d) => d.count));
  }

  get maxSignups(): number {
    if (!this.stats || this.stats.signups.length === 0) return 1;
    return Math.max(1, ...this.stats.signups.map((s) => s.count));
  }

  get totalSignupsInWindow(): number {
    return this.stats?.signups.reduce((sum, point) => sum + point.count, 0) ?? 0;
  }

  /** Students who have not touched a word in a week, or never have at all. */
  get dormantStudents(): StudentRow[] {
    return (this.stats?.students ?? []).filter((s) => s.daysSinceActive === null || s.daysSinceActive >= 7);
  }

  get sortedStudents(): StudentRow[] {
    const students = [...(this.stats?.students ?? [])];

    if (this.sortKey === 'email') {
      return students.sort((a, b) => a.email.localeCompare(b.email, 'tr'));
    }

    if (this.sortKey === 'lastActive') {
      // Never-active students sort to the top: they need attention most.
      return students.sort((a, b) => (b.daysSinceActive ?? Number.MAX_SAFE_INTEGER) - (a.daysSinceActive ?? Number.MAX_SAFE_INTEGER));
    }

    return students.sort((a, b) => b.learnedCount - a.learnedCount);
  }

  setSort(key: StudentSortKey) {
    this.sortKey = key;
  }

  formatDay(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { weekday: 'short' });
  }

  formatWeek(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  formatLastActive(student: StudentRow): string {
    if (student.daysSinceActive === null) return 'Hiç';
    if (student.daysSinceActive === 0) return 'Bugün';
    if (student.daysSinceActive === 1) return 'Dün';
    return `${student.daysSinceActive} gün önce`;
  }

  initials(email: string): string {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  }

  exportStudents() {
    if (!this.stats || this.stats.students.length === 0) return;

    const rows = [
      ['E-posta', 'Öğrenilen Kelime', 'Ustalık %', 'Son Aktiflik', 'Gün Önce'],
      ...this.sortedStudents.map((student) => [
        student.email,
        String(student.learnedCount),
        String(student.masteryPercent),
        student.lastActiveAt ? new Date(student.lastActiveAt).toLocaleDateString('tr-TR') : 'Hiç',
        student.daysSinceActive === null ? '' : String(student.daysSinceActive)
      ])
    ];
    // The BOM keeps Turkish characters readable when the file is opened in Excel.
    const csv = '﻿' + rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ogrenci-listesi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
