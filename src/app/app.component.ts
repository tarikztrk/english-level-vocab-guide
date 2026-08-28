import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly user$ = this.authService.user$;
  readonly isAdmin$ = this.authService.isAdmin$;

  constructor(private authService: AuthService) {}

  async signOut() {
    await this.authService.signOut();
  }
}
