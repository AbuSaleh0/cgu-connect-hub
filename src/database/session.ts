import { UserPublic } from './types';

class SessionManager {
  private static instance: SessionManager | null = null;
  private storageKey = 'cgu-connect-session';
  private currentUser: UserPublic | null = null;

  private constructor() {
    this.loadSession();
  }

  public static getInstance(): SessionManager {
    if (!this.instance) {
      this.instance = new SessionManager();
    }
    return this.instance;
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      this.clearSession();
    }
  }

  private saveSession(): void {
    if (this.currentUser) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  public login(user: UserPublic): void {
    this.currentUser = user;
    this.saveSession();
  }

  public logout(): void {
    this.currentUser = null;
    this.clearSession();
  }

  public clearSession(): void {
    localStorage.removeItem(this.storageKey);
    this.currentUser = null;
  }

  public getCurrentUser(): UserPublic | null {
    return this.currentUser;
  }

  public isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  public getUserId(): number | null {
    return this.currentUser?.id || null;
  }

  public getUsername(): string | null {
    return this.currentUser?.username || null;
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();