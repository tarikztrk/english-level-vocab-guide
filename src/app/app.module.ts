import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListViewComponent } from './components/list-view/list-view.component';
import { FlashcardsComponent } from './components/flashcards/flashcards.component';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [AppComponent, DashboardComponent, ListViewComponent, FlashcardsComponent],
  imports: [BrowserModule, CommonModule, FormsModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
