import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonInput, IonSpinner } from '@ionic/angular';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonInput, IonButton, IonSpinner],
})
export class LoginPage {
  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  isLoading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  setMode(mode: 'login' | 'register') {
    this.mode = mode;
    this.error = '';
  }

  async submit() {
    this.error = '';

    const username = this.username.trim();
    const password = this.password;

    if (username.length < 2) {
      this.error = '用戶名至少 2 個字';
      return;
    }

    if (password.length < 6) {
      this.error = '密碼至少 6 個字';
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      if (this.mode === 'register') {
        await this.auth.register(username, password);
      } else {
        await this.auth.login(username, password);
      }

      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/tabs/home';
      await this.router.navigateByUrl(redirect, { replaceUrl: true });
    } catch (error) {
      this.error = error instanceof Error ? error.message : '登入失敗，請稍後再試';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
