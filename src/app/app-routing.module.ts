import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListViewComponent } from './components/list-view/list-view.component';
import { FlashcardsComponent } from './components/flashcards/flashcards.component';
import { AuthComponent } from './components/auth/auth.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { AdminVocabularyComponent } from './components/admin/admin-vocabulary/admin-vocabulary.component';
import { AdminAnalyticsComponent } from './components/admin/admin-analytics/admin-analytics.component';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'list', component: ListViewComponent },
  { path: 'flashcards', component: FlashcardsComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  { path: 'admin/vocabulary', component: AdminVocabularyComponent, canActivate: [AdminGuard] },
  { path: 'admin/analytics', component: AdminAnalyticsComponent, canActivate: [AdminGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
