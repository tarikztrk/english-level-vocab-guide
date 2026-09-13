import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import localeTr from '@angular/common/locales/tr';

import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListViewComponent } from './components/list-view/list-view.component';
import { FlashcardsComponent } from './components/flashcards/flashcards.component';
import { AuthComponent } from './components/auth/auth.component';
import { AppRoutingModule } from './app-routing.module';
import { SupabaseService } from './services/supabase.service';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { AdminVocabularyComponent } from './components/admin/admin-vocabulary/admin-vocabulary.component';
import { AdminAnalyticsComponent } from './components/admin/admin-analytics/admin-analytics.component';
import { AdminChangelogComponent } from './components/admin/admin-changelog/admin-changelog.component';
import { AdminHeaderComponent } from './components/admin/admin-header/admin-header.component';

registerLocaleData(localeTr);

@NgModule({
  declarations: [AppComponent, DashboardComponent, ListViewComponent, FlashcardsComponent, AuthComponent, AdminDashboardComponent, AdminVocabularyComponent, AdminAnalyticsComponent, AdminChangelogComponent, AdminHeaderComponent],
  imports: [BrowserModule, CommonModule, FormsModule, AppRoutingModule],
  providers: [SupabaseService, { provide: LOCALE_ID, useValue: 'tr' }],
  bootstrap: [AppComponent]
})
export class AppModule { }
