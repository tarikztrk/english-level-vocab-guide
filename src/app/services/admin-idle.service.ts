import { Injectable, NgZone } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './auth.service';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

/**
 * Signs an admin out after 20 minutes with no mouse/keyboard/touch activity while
 * they're on an /admin/* route. The admin write policies are already enforced
 * server-side (RLS), but an unattended, still-authenticated admin tab left open
 * on a shared machine is exactly the kind of exposure a session timeout closes.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminIdleService {
  private watching = false;
  private timeoutHandle?: ReturnType<typeof setTimeout>;
  private readonly boundReset = () => this.resetTimer();

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      if (!event.urlAfterRedirects.startsWith('/admin')) {
        this.disarm();
      }
    });
  }

  /** Idempotent: safe to call on every admin route activation. */
  arm() {
    if (this.watching) {
      this.resetTimer();
      return;
    }

    this.watching = true;
    this.ngZone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, this.boundReset, { passive: true }));
    });
    this.resetTimer();
  }

  disarm() {
    if (!this.watching) {
      return;
    }

    this.watching = false;
    ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, this.boundReset));
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
  }

  private resetTimer() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }

    this.timeoutHandle = setTimeout(() => this.ngZone.run(() => void this.onIdle()), IDLE_TIMEOUT_MS);
  }

  private async onIdle() {
    this.disarm();
    await this.authService.signOut();
    await this.router.navigate(['/auth'], { queryParams: { reason: 'timeout' } });
  }
}
