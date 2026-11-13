import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, hammerOutline } from 'ionicons/icons';

import { Auction, AuctionService } from '../services/auction.service';

@Component({
  selector: 'app-auction-list',
  templateUrl: 'auction-list.page.html',
  styleUrls: ['auction-list.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonFab,
    IonFabButton,
    IonIcon,
  ],
})
export class AuctionListPage implements OnDestroy {
  auctions: Auction[] = [];
  isLoading = true;
  error = '';

  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private auctionService: AuctionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ addOutline, hammerOutline });
  }

  ionViewWillEnter() {
    void this.load();

    if (!this.timer) {
      // 每 10 秒刷新一次狀態（即將開始 → 進行中 → 已結束）
      this.timer = setInterval(() => void this.load(), 10000);
    }
  }

  ionViewWillLeave() {
    this.stopTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  openAuction(auction: Auction) {
    void this.router.navigate(['/auction', auction.id]);
  }

  createAuction() {
    void this.router.navigate(['/auction/create']);
  }

  imageUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    return path.startsWith('http') ? path : `${this.auctionService.imageUrlBase}/${path}`;
  }

  stateText(auction: Auction): string {
    if (auction.state === 'live') {
      return '進行中';
    }

    return auction.state === 'scheduled' ? '即將開始' : '已結束';
  }

  /** 距離開始／結束還有多久 */
  timeText(auction: Auction): string {
    const start = new Date(auction.start_at).getTime();
    const end = new Date(auction.end_at).getTime();
    const now = Date.now();

    if (now < start) {
      return `${this.duration(start - now)}後開始`;
    }

    if (now < end) {
      return `剩 ${this.duration(end - now)}`;
    }

    return '已結束';
  }

  priceText(auction: Auction): string {
    const current = Number(auction.current_bid ?? 0);

    return current > 0
      ? `現時 HK$ ${current.toLocaleString()}`
      : `起標 HK$ ${Number(auction.start_price).toLocaleString()}`;
  }

  private duration(ms: number): string {
    const minutes = Math.floor(ms / 60000);

    if (minutes < 60) {
      return `${minutes} 分鐘`;
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return rest > 0 ? `${hours} 小時 ${rest} 分` : `${hours} 小時`;
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async load() {
    try {
      this.auctions = await this.auctionService.list();
      this.error = '';
    } catch (error) {
      this.error = error instanceof Error ? error.message : '無法載入拍賣';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
