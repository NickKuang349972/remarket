import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { Auction, AuctionMessage, AuctionService, Bid } from '../services/auction.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auction-room',
  templateUrl: 'auction-room.page.html',
  styleUrls: ['auction-room.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner,
  ],
})
export class AuctionRoomPage implements OnInit, OnDestroy {
  id = 0;
  auction?: Auction;
  bids: Bid[] = [];
  messages: AuctionMessage[] = [];
  draftBid: string | number = '';
  draftMessage = '';
  isLoading = true;
  error = '';
  now = Date.now();

  private tickTimer?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private stopStream?: () => void;

  constructor(
    private route: ActivatedRoute,
    private auctionService: AuctionService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
  ) {}

  get isSeller(): boolean {
    return !!this.auction && this.auction.seller === this.auth.username;
  }

  get startTime(): number {
    return this.auction ? new Date(this.auction.start_at).getTime() : 0;
  }

  get endTime(): number {
    return this.auction ? new Date(this.auction.end_at).getTime() : 0;
  }

  get isLive(): boolean {
    return !!this.auction && this.now >= new Date(this.auction.start_at).getTime() && this.now < new Date(this.auction.end_at).getTime();
  }

  get currentBid(): number {
    return Number(this.auction?.current_bid ?? 0);
  }

  /** 下一個有效出價 */
  get minimumBid(): number {
    if (!this.auction) {
      return 0;
    }

    const base = this.currentBid > 0 ? this.currentBid : Number(this.auction.start_price);

    return this.currentBid > 0 ? base + Number(this.auction.min_increment) : base;
  }

  get countdownText(): string {
    if (!this.auction) {
      return '';
    }

    const start = new Date(this.auction.start_at).getTime();
    const end = new Date(this.auction.end_at).getTime();

    if (this.now < start) {
      return `距開始 ${this.duration(start - this.now)}`;
    }

    if (this.now < end) {
      return `剩 ${this.duration(end - this.now)}`;
    }

    return '拍賣已結束';
  }

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    void this.load();

    this.tickTimer = setInterval(() => {
      this.now = Date.now();
      this.cdr.markForCheck();
    }, 1000);

    // 出價用 SSE 即時更新；房間訊息用 5 秒輪詢（比較簡單）
    if (this.auth.isLoggedIn) {
      this.stopStream = this.auctionService.streamBids(this.id, (bid) => {
        this.applyBid(bid);
      });

      this.refreshTimer = setInterval(() => void this.refreshMessages(), 5000);
    }
  }

  ngOnDestroy() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.stopStream?.();
    this.auctionService.disconnect();
  }

  async placeBid() {
    const amount = Number(String(this.draftBid).trim());

    if (!Number.isFinite(amount) || amount <= 0) {
      await this.showToast('請輸入出價金額');
      return;
    }

    try {
      await this.auctionService.bid(this.id, amount);
      this.draftBid = '';
      await this.showToast('出價成功');
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '出價失敗');
    } finally {
      this.cdr.markForCheck();
    }
  }

  async sendMessage() {
    const content = this.draftMessage.trim();

    if (!content) {
      return;
    }

    try {
      await this.auctionService.postMessage(this.id, content);
      this.draftMessage = '';
      await this.refreshMessages();
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '發送失敗');
    }
  }

  imageUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    return path.startsWith('http') ? path : `${this.auctionService.imageUrlBase}/${path}`;
  }

  private applyBid(bid: Bid) {
    if (this.bids.some((item) => item.id === bid.id)) {
      return;
    }

    this.bids = [...this.bids, bid];

    if (this.auction && Number(bid.amount) > this.currentBid) {
      this.auction = {
        ...this.auction,
        current_bid: Number(bid.amount),
        leader: bid.bidder,
      };
    }

    this.cdr.markForCheck();
  }

  private async load() {
    try {
      const detail = await this.auctionService.detail(this.id);
      this.auction = detail.data;
      this.bids = detail.bids;
      this.messages = detail.messages;
      this.error = '';
    } catch (error) {
      this.error = error instanceof Error ? error.message : '無法載入拍賣';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async refreshMessages() {
    try {
      const detail = await this.auctionService.detail(this.id);
      this.auction = detail.data;
      this.messages = detail.messages;

      // SSE 可能遺漏（例如重連），把詳情內的出價也合併進來
      for (const bid of detail.bids) {
        this.applyBid(bid);
      }
    } catch {
      // 忽略，下一輪再試
    }
  }

  private duration(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);

      return `${hours} 小時 ${minutes % 60} 分`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'bottom',
    });

    await toast.present();
  }
}
