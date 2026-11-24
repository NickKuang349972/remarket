import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, sendOutline } from 'ionicons/icons';

import {
  ChatMessage,
  ChatService,
  ChatStreamEvent,
  ConversationDetail,
  Offer,
} from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { Product } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';

type TimelineItem =
  | { kind: 'message'; sortKey: string; message: ChatMessage }
  | { kind: 'offer'; sortKey: string; offer: Offer };

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.page.html',
  styleUrls: ['chat.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonFooter,
    IonChip,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) private content?: IonContent;

  readonly quickReplies = ['還在嗎？', '可以便宜點嗎？', '在哪裡面交？'];

  conversationId = 0;
  conversation?: ConversationDetail;
  product?: Product;
  messages: ChatMessage[] = [];
  offers: Offer[] = [];
  draft = '';
  isSending = false;
  isUploading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private alertController: AlertController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
    public userData: UserDataService,
  ) {
    addIcons({ sendOutline, cameraOutline });
  }

  /** 這件商品是不是自己刊登的（決定角色：賣家 or 買家） */
  get isOwner(): boolean {
    if (this.conversation?.seller) {
      return this.conversation.seller === this.auth.username;
    }

    return this.userData.myListingIds.map(Number).includes(Number(this.product?.id ?? 0));
  }

  /** 訊息與議價卡片按時間合併成同一條時間線 */
  get timeline(): TimelineItem[] {
    const items: TimelineItem[] = [
      ...this.messages.map((message) => ({
        kind: 'message' as const,
        sortKey: `${message.created_at}#${String(message.id).padStart(10, '0')}`,
        message,
      })),
      ...this.offers.map((offer) => ({
        kind: 'offer' as const,
        sortKey: `${offer.created_at}#o${String(offer.id).padStart(10, '0')}`,
        offer,
      })),
    ];

    return items.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  }

  canReplyTo(offer: Offer): boolean {
    return this.isOwner && offer.status === 'pending';
  }

  get latestOffer(): Offer | undefined {
    return this.offers.length > 0 ? this.offers[this.offers.length - 1] : undefined;
  }

  dealStatusText(offer: Offer): string {
    switch (offer.status) {
      case 'pending':
        return '等待回覆';
      case 'accepted':
        return '等待買家付款';
      default:
        return '已拒絕，可再出價';
    }
  }

  async payOffer(event: Event) {
    event.stopPropagation();
  }

  offerBubbleTitle(offer: Offer): string {
    const mine = offer.buyer === this.auth.username;

    switch (offer.status) {
      case 'pending':
        return mine ? '我已出價，待回覆' : '買家已出價，待回覆';
      case 'accepted':
        return '出價已同意';
      default:
        return '出價已婉拒';
    }
  }

  offerNote(offer: Offer): string {
    switch (offer.status) {
      case 'pending':
        return '請雙方溝通及時確認價格';
      case 'accepted':
        return '賣家已同意，等待買家付款';
      default:
        return '買家可以再提出新價格';
    }
  }

  async replyToOffer(offer: Offer, action: 'accept' | 'reject') {
    try {
      const status = await this.chatService.replyOffer(offer.id, action);

      this.offers = this.offers.map((item) =>
        item.id === offer.id ? { ...item, status } : item,
      );

      await this.showToast(status === 'accepted' ? '已同意出價' : '已拒絕出價');
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '回覆失敗');
    } finally {
      this.cdr.markForCheck();
    }
  }

  /** 買家只有在最新一筆出價被拒絕後，才能再次出價 */
  canReofferFor(offer: Offer): boolean {
    return (
      !this.isOwner &&
      offer.status === 'rejected' &&
      offer.id === this.latestOffer?.id &&
      offer.buyer === this.auth.username
    );
  }

  async reoffer() {
    const latest = this.latestOffer;

    if (!this.product || !latest || !this.canReofferFor(latest)) {
      return;
    }

    const price = Number(this.product.price);
    const suggested = Math.max(1, Math.floor(price * 0.9));

    const alert = await this.alertController.create({
      header: '再次出價',
      message: `向「${this.product.title}」提出新價格（建議價 HK$ ${suggested}）`,
      inputs: [
        {
          name: 'price',
          type: 'number',
          placeholder: '輸入你的出價 (HK$)',
          min: 1,
          value: suggested,
        },
      ],
      buttons: [
        { text: '取消', role: 'cancel' },
        {
          text: '送出出價',
          handler: (data) => {
            const value = Number(data?.price);

            if (!Number.isFinite(value) || value <= 0) {
              void this.showToast('請輸入有效的出價');
              return false;
            }

            void this.submitReoffer(value);
            return true;
          },
        },
      ],
    });

    await alert.present();
    this.cdr.markForCheck();
  }

  private async submitReoffer(value: number) {
    try {
      await this.chatService.createOffer(this.conversationId, value);

      // SSE 會推送最新快照，這裡再拉一次避免連線剛好斷開時畫面沒更新
      const detail = await this.chatService.detail(this.conversationId);
      this.offers = detail.offers;

      await this.showToast(`出價 HK$ ${value} 已送出`);
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '出價失敗');
    } finally {
      this.cdr.markForCheck();
    }
  }

  ngOnInit() {
    this.conversationId = Number(this.route.snapshot.paramMap.get('conversationId'));

    void this.init();
  }

  private async init() {
    await this.loadConversation();

    if (this.auth.isLoggedIn && this.conversation) {
      this.connect();
    }
  }

  ngOnDestroy() {
    this.chatService.disconnect();
  }

  goToProduct() {
    if (this.product) {
      void this.router.navigate(['/product', this.product.id]);
    }
  }

  useQuickReply(text: string) {
    this.draft = text;
    this.cdr.markForCheck();
  }

  formatMessageTime(timestamp: string): string {
    const date = new Date(String(timestamp).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (date.getTime() >= startOfToday) {
      return time;
    }

    if (date.getTime() >= startOfYesterday) {
      return `昨天 ${time}`;
    }

    const pad = (value: number) => String(value).padStart(2, '0');

    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`;
  }

  async send() {
    const content = this.draft.trim();

    if (!content || this.isSending) {
      return;
    }

    this.isSending = true;

    try {
      await this.chatService.send(this.conversationId, content);
      this.draft = '';
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '發送失敗');
    } finally {
      this.isSending = false;
      this.cdr.markForCheck();
    }
  }

  isMine(message: ChatMessage): boolean {
    return message.sender === this.auth.username;
  }

  /** 選一張相片直接傳送（可連同輸入框文字一起送） */
  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    // 清空 value，才能重複選同一張檔案
    input.value = '';

    if (!file) {
      return;
    }

    this.isUploading = true;
    this.cdr.markForCheck();

    try {
      await this.chatService.send(this.conversationId, this.draft.trim(), file);
      this.draft = '';
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '圖片傳送失敗');
    } finally {
      this.isUploading = false;
      this.cdr.markForCheck();
    }
  }

  imageUrl(path?: string): string | undefined {
    return this.chatService.imageUrl(path);
  }

  async openImagePreview(message: ChatMessage) {
    const src = this.imageUrl(message.image);

    if (!src) {
      return;
    }

    try {
      const { width, height } = await this.loadImageSize(src);

      const PhotoSwipeModule = await import('photoswipe');
      const PhotoSwipe = PhotoSwipeModule.default;

      const pswp = new PhotoSwipe({
        dataSource: [
          {
            src,
            width,
            height,
            alt: '聊天圖片',
          },
        ],
        index: 0,
        wheelToZoom: true,
      });

      pswp.on('close', () => {
        pswp.destroy();
      });

      pswp.init();
    } catch (error) {
      console.error('Failed to open PhotoSwipe preview:', error);
    }
  }

  private loadImageSize(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  private connect() {
    this.chatService.connect(this.conversationId, (event: ChatStreamEvent) => {
      if (event.type === 'offers') {
        this.offers = event.offers;
        this.cdr.markForCheck();
        return;
      }

      // SSE 重連時可能會重送，用 id 去重
      if (this.messages.some((item) => item.id === event.message.id)) {
        return;
      }

      this.messages = [...this.messages, event.message];
      this.userData.markRead(this.conversationId, event.message.id);
      this.cdr.markForCheck();
      void this.scrollToBottom();
    });
  }

  private async loadConversation() {
    try {
      const detail = await this.chatService.detail(this.conversationId);

      this.conversation = detail.conversation;
      this.product = {
        id: detail.conversation.product_id,
        title: detail.conversation.title,
        price: detail.conversation.price,
        description: detail.conversation.description ?? '',
        image: detail.conversation.image,
        seller: detail.conversation.seller,
        status: detail.conversation.status,
        category: detail.conversation.category,
        address: detail.conversation.address,
      };
      this.messages = detail.messages;
      this.offers = detail.offers;

      const last = this.messages[this.messages.length - 1];
      if (last) {
        this.userData.markRead(this.conversationId, last.id);
      }
    } catch (error) {
      this.product = undefined;
      await this.showToast(error instanceof Error ? error.message : '無法開啟對話');
    } finally {
      this.cdr.markForCheck();
      await this.scrollToBottom();
    }
  }

  private async scrollToBottom() {
    await this.content?.scrollToBottom(300);
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
