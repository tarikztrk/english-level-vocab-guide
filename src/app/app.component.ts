import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  readonly user$ = this.authService.user$;
  readonly isAdmin$ = this.authService.isAdmin$;

  @ViewChild('appHeader') private headerRef?: ElementRef<HTMLElement>;
  private headerResizeObserver?: ResizeObserver;

  constructor(private authService: AuthService) {}

  /**
   * Sticky sections inside a page (the vocabulary filter bar) have to park right
   * below this header, whose height changes when the nav wraps on narrow screens.
   * Publishing the measured height keeps them from sliding underneath it.
   */
  ngAfterViewInit() {
    const header = this.headerRef?.nativeElement;

    if (!header || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.headerResizeObserver = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--app-header-height', `${header.offsetHeight}px`);
    });
    this.headerResizeObserver.observe(header);
  }

  ngOnDestroy() {
    this.headerResizeObserver?.disconnect();
  }

  async signOut() {
    await this.authService.signOut();
  }
}
