import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

@NgModule({
  declarations: [AppComponent, DashboardComponent, ListViewComponent, FlashcardsComponent, AuthComponent, AdminDashboardComponent, AdminVocabularyComponent, AdminAnalyticsComponent],
  imports: [BrowserModule, CommonModule, FormsModule, AppRoutingModule],
  providers: [SupabaseService],
  bootstrap: [AppComponent]
})
export class AppModule { }
