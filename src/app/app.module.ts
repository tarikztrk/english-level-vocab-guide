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

@NgModule({
  declarations: [AppComponent, DashboardComponent, ListViewComponent, FlashcardsComponent, AuthComponent],
  imports: [BrowserModule, CommonModule, FormsModule, AppRoutingModule],
  providers: [SupabaseService],
  bootstrap: [AppComponent]
})
export class AppModule { }
