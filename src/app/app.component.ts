import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private auth: AuthService) {
    // App 啟動時用本機 token 向後端確認身分（過期就自動登出）
    void this.auth.restore();
  }
}
