import { User } from '@/database/types';

class SessionManager {
    private readonly STORAGE_KEY = 'cgu_connect_user';

    login(user: User): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        // Dispatch a custom event so components can react to storage changes
        window.dispatchEvent(new Event('storage'));
    }

    logout(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        window.dispatchEvent(new Event('storage'));
    }

    getCurrentUser(): User | null {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return null;
        try {
            return JSON.parse(data) as User;
        } catch (error) {
            console.error('Error parsing user session:', error);
            return null;
        }
    }

    isLoggedIn(): boolean {
        return !!this.getCurrentUser();
    }
}

export const sessionManager = new SessionManager();
