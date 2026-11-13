import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, hammerOutline, homeOutline, mapOutline, personOutline } from 'ionicons/icons';

import { ChatService } from '../services/chat.service';
import { UserDataService } from '../services/user-data.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonBadge, IonLabel],
})
export class TabsPage implements OnDestroy {
  unreadCount = 0;

  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    public userData: UserDataService,
  ) {
    addIcons({ homeOutline, mapOutline, hammerOutline, addCircleOutline, personOutline });

    // SSE 只用在聊天室內部；分頁列用簡單輪詢（20 秒）檢查未讀
    void this.refreshUnread();
    this.timer = setInterval(() => void this.refreshUnread(), 20000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async refreshUnread() {
    if (!this.userData.myListingIds.length && !this.userData.chatProductIds.length) {
      this.setUnread(0);
      return;
    }

    try {
      const conversations = await this.chatService.getConversations();
      const unread = conversations.filter(
        (item) => Number(item.id) > this.userData.lastReadOf(Number(item.product_id)),
      ).length;

      this.setUnread(unread);
    } catch {
      // 後端暫時不可用時不要打擾使用者，下一輪再試
    }
  }

  private setUnread(count: number) {
    if (count === this.unreadCount) {
      return;
    }

    this.unreadCount = count;
    this.cdr.markForCheck();
  }
}
