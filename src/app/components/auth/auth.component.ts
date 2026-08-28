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
    return this.mode === 'signIn' ? 'EnglishAcademy\'ye giriş yapın' : 'EnglishAcademy hesabı oluşturun';
  }

  get submitLabel() {
    return this.mode === 'signIn' ? 'Giriş Yap' : 'Hesap Oluştur';
  }

  get toggleLabel() {
    return this.mode === 'signIn' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın';
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
      this.errorMessage = 'E-posta adresinizi ve en az 6 karakterli bir şifre girin.';
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

      this.successMessage = 'Hesabınız oluşturuldu. E-postanızdaki doğrulama bağlantısına tıklayıp giriş yapın.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Giriş yapılamadı.';
    } finally {
      this.loading = false;
    }
  }
}
