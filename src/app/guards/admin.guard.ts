import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminIdleService } from '../services/admin-idle.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private adminIdleService: AdminIdleService
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const isAdmin = await this.authService.isAdmin();

    if (!isAdmin) {
      return this.router.createUrlTree(['/']);
    }

    this.adminIdleService.arm();
    return true;
  }
}
