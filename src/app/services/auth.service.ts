import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AppUser {
  id: number;
  username: string;
}

interface AuthResponse {
  status: 'success' | 'error';
  message?: string;
  token?: string;
  user?: AppUser;
}

const TOKEN_KEY = 'remarket.token';
const USER_KEY = 'remarket.user';

/**
 * 登入狀態：token 存在 localStorage，每次請求放在 Authorization header。
 * 頁面只透過這個 service 拿「目前是誰」，不要自己去讀 localStorage。
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly userSignal = signal<AppUser | null>(this.readUser());

  readonly user = this.userSignal.asReadonly();

  get isLoggedIn(): boolean {
    return this.userSignal() !== null;
  }

  get username(): string {
    return this.userSignal()?.username ?? '';
  }

  get token(): string {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  }

  authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token}` });
  }

  async register(username: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.baseUrl}/auth_register.php`, this.form(username, password)),
    );

    this.applySession(response);
  }

  async login(username: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.baseUrl}/auth_login.php`, this.form(username, password)),
    );

    this.applySession(response);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<AuthResponse>(
          `${this.baseUrl}/auth_logout.php`,
          new FormData(),
          { headers: this.authHeaders() },
        ),
      );
    } catch {
      // 就算後端失敗，前端也要清掉，避免卡在「已登入」的假象
    }

    this.clearSession();
  }

  /** App 啟動時用 token 向後端確認身分；token 過期就自動登出 */
  async restore(): Promise<void> {
    if (!this.token) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<AuthResponse>(`${this.baseUrl}/auth_me.php`, {
          headers: this.authHeaders(),
        }),
      );

      if (response.user) {
        this.userSignal.set(response.user);
        this.writeUser(response.user);
      }
    } catch {
      this.clearSession();
    }
  }

  private form(username: string, password: string): FormData {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    return form;
  }

  private applySession(response: AuthResponse) {
    if (response.status !== 'success' || !response.token || !response.user) {
      throw new Error(response.message ?? '登入失敗');
    }

    localStorage.setItem(TOKEN_KEY, response.token);
    this.userSignal.set(response.user);
    this.writeUser(response.user);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  private readUser(): AppUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }

  private writeUser(user: AppUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}
