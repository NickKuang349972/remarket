import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
  withHashLocation,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

/**
 * 線上版的後端網址從 GitHub 讀取（runtime-config.json）。
 * 好處：Cloudflare 通道每次重開網址都會變，只要改 GitHub 上那個檔案，
 * 不需要重新 build 或重新部署。
 */
const RUNTIME_CONFIG_URL =
  'https://raw.githubusercontent.com/NickKuang349972/remarket/master/runtime-config.json';

async function applyRuntimeConfig(): Promise<void> {
  // 開發時（ionic serve）用 environment.ts 的 localhost，不去抓遠端設定
  if (!environment.production) {
    return;
  }

  try {
    const response = await fetch(`${RUNTIME_CONFIG_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const config = (await response.json()) as { apiBaseUrl?: string };

    if (config.apiBaseUrl) {
      environment.apiBaseUrl = config.apiBaseUrl;
    }
  } catch {
    // 抓不到就沿用 build 時的預設值
  }
}

void applyRuntimeConfig().finally(() => {
  bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideIonicAngular(),
      provideHttpClient(),
      provideRouter(
        routes,
        withPreloading(PreloadAllModules),
        withComponentInputBinding(),
        withHashLocation(),
      ),
    ],
  });
});
