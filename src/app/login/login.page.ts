import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';

import { AuthService } from '../services/auth.service';

const LAST_USERNAME_KEY = 'remarket.last_username';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonInput, IonButton, IonSpinner, IonCheckbox, IonIcon],
})
export class LoginPage implements OnInit {
  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  nickname = '';
  rememberMe = false;
  isLoading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ alertCircleOutline });
  }

  ngOnInit() {
    const lastUsername = localStorage.getItem(LAST_USERNAME_KEY);

    if (lastUsername) {
      this.username = lastUsername;
      this.rememberMe = true;
    }
  }

  setMode(mode: 'login' | 'register') {
    this.mode = mode;
    this.error = '';
  }

  async submit() {
    if (this.isLoading) {
      return;
    }

    this.error = '';

    const username = this.username.trim();
    const password = this.password;
    const nickname = this.nickname.trim();

    if (username.length < 2) {
      this.error = '用戶名至少 2 個字';
      return;
    }

    if (password.length < 6) {
      this.error = '密碼至少 6 個字';
      return;
    }

    if (this.mode === 'register' && nickname.length > 50) {
      this.error = '暱稱最長 50 個字';
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      if (this.mode === 'register') {
        await this.auth.register(username, password, nickname);
      } else {
        await this.auth.login(username, password);
      }

      if (this.rememberMe) {
        localStorage.setItem(LAST_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(LAST_USERNAME_KEY);
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
