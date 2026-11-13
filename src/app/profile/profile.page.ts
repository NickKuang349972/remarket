import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonImg,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import { ChatService, Conversation } from '../services/chat.service';
import { Product, ProductService } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';

/** 「我的對話」列表的一列：對話摘要 + 是否未讀 */
interface ConversationItem extends Conversation {
  unread: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonImg,
  ],
})
export class ProfilePage {
  myProducts: Product[] = [];
  favoriteProducts: Product[] = [];
  conversations: ConversationItem[] = [];

  constructor(
    private productService: ProductService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public auth: AuthService,
    public userData: UserDataService,
  ) {}

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  async ionViewWillEnter() {
    let products: Product[] = [];

    try {
      products = await this.productService.getProducts();
    } catch (error) {
      console.error('載入我的資料失敗', error);
    }

    const myIds = this.userData.myListingIds.map(Number);
    const favoriteIds = this.userData.favoriteIds.map(Number);
    const me = this.auth.username;

    // 有 seller 就以 seller 為準（跨裝置正確）；舊資料沒有 seller 才退回 localStorage
    this.myProducts = products.filter((product) =>
      product.seller ? product.seller === me : myIds.includes(Number(product.id)),
    );
    this.favoriteProducts = products.filter((product) => favoriteIds.includes(Number(product.id)));

    try {
      const list = await this.chatService.getConversations();

      this.conversations = list.map((item) => ({
        ...item,
        unread: Number(item.id) > this.userData.lastReadOf(Number(item.product_id)),
      }));
    } catch (error) {
      console.error('載入對話失敗', error);
      this.conversations = [];
    }

    this.cdr.markForCheck();
  }

  /** 對話列表的預覽文字 */
  previewText(item: ConversationItem): string {
    return `${item.sender}：${item.content}`;
  }

  imageUrl(path?: string): string | undefined {
    return this.productService.imageUrl(path);
  }
}
