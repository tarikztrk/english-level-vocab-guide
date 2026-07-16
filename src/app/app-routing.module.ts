import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListViewComponent } from './components/list-view/list-view.component';
import { FlashcardsComponent } from './components/flashcards/flashcards.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'list', component: ListViewComponent },
  { path: 'flashcards', component: FlashcardsComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
