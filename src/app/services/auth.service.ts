import { Injectable } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly sessionSubject = new BehaviorSubject<Session | null>(null);
  readonly session$ = this.sessionSubject.asObservable();

  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    void this.loadSession();

    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
    });
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    this.setSession(data.session);
    return data;
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    this.setSession(data.session);
    return data;
  }

  async signOut() {
    const { error } = await this.supabaseService.client.auth.signOut();

    if (error) {
      throw error;
    }

    this.setSession(null);
  }

  get currentUser() {
    return this.userSubject.value;
  }

  private async loadSession() {
    const { data, error } = await this.supabaseService.client.auth.getSession();

    if (error) {
      console.error('Could not load auth session', error);
      this.setSession(null);
      return;
    }

    this.setSession(data.session);
  }

  private setSession(session: Session | null) {
    this.sessionSubject.next(session);
    this.userSubject.next(session?.user ?? null);
  }
}
