import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  mode: 'signIn' | 'signUp' = 'signIn';
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  get title() {
    return this.mode === 'signIn' ? 'Sign in to LexiLearn' : 'Create your LexiLearn account';
  }

  get submitLabel() {
    return this.mode === 'signIn' ? 'Sign In' : 'Create Account';
  }

  get toggleLabel() {
    return this.mode === 'signIn' ? 'Need an account? Sign up' : 'Already have an account? Sign in';
  }

  toggleMode() {
    this.mode = this.mode === 'signIn' ? 'signUp' : 'signIn';
    this.errorMessage = '';
    this.successMessage = '';
  }

  async submit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email.trim() || this.password.length < 6) {
      this.errorMessage = 'Enter an email and a password with at least 6 characters.';
      return;
    }

    this.loading = true;

    try {
      if (this.mode === 'signIn') {
        await this.authService.signIn(this.email.trim(), this.password);
        await this.router.navigate(['/']);
        return;
      }

      const result = await this.authService.signUp(this.email.trim(), this.password);

      if (result.session) {
        await this.router.navigate(['/']);
        return;
      }

      this.successMessage = 'Account created. Check your email to confirm your account, then sign in.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Authentication failed.';
    } finally {
      this.loading = false;
    }
  }
}
