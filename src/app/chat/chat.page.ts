import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
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

import { ChatMessage, ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { Product, ProductService } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';

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
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) private content?: IonContent;

  productId = 0;
  product?: Product;
  messages: ChatMessage[] = [];
  draft = '';
  isSending = false;
  isUploading = false;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private productService: ProductService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
    public userData: UserDataService,
  ) {
    addIcons({ sendOutline, cameraOutline });
  }

  /** 這件商品是不是自己刊登的（決定角色：賣家 or 買家） */
  get isOwner(): boolean {
    if (this.product?.seller) {
      return this.product.seller === this.auth.username;
    }

    return this.userData.myListingIds.map(Number).includes(Number(this.productId));
  }

  ngOnInit() {
    this.productId = Number(this.route.snapshot.paramMap.get('productId'));

    void this.loadProduct();

    if (this.auth.isLoggedIn) {
      this.connect();
    }
  }

  ngOnDestroy() {
    this.chatService.disconnect();
  }

  async send() {
    const content = this.draft.trim();

    if (!content || this.isSending) {
      return;
    }

    this.isSending = true;

    try {
      await this.chatService.send(this.productId, content);
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
      await this.chatService.send(this.productId, this.draft.trim(), file);
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

  private connect() {
    this.userData.addChatProduct(this.productId);

    this.chatService.connect(this.productId, (message) => {
      // SSE 重連時可能會重送，用 id 去重
      if (this.messages.some((item) => item.id === message.id)) {
        return;
      }

      this.messages = [...this.messages, message];
      this.userData.markRead(this.productId, message.id);
      this.cdr.markForCheck();
      void this.scrollToBottom();
    });
  }

  private async loadProduct() {
    try {
      this.product = await this.productService.getProduct(this.productId);
    } catch {
      this.product = undefined;
    }

    this.cdr.markForCheck();
  }

  private async scrollToBottom() {
    await this.content?.scrollToBottom(200);
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
