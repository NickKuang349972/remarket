import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  createOutline,
  heart,
  heartOutline,
  pricetagOutline,
  refreshOutline,
  shareOutline,
  trashOutline,
} from 'ionicons/icons';

import { Product, ProductService } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';
import { AuthService } from '../services/auth.service';
import { ChatService, OfferStatus } from '../services/chat.service';
import { PRODUCT_CATEGORIES } from '../models/product-category';

@Component({
  selector: 'app-product-detail',
  templateUrl: 'product-detail.page.html',
  styleUrls: ['product-detail.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonSkeletonText,
    IonSpinner,
    IonModal,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
  ],
})
export class ProductDetailPage implements OnInit {
  product?: Product;
  isLoading = true;
  notFound = false;

  isEditOpen = false;
  editTitle = '';
  editPrice: string | number = '';
  editDescription = '';
  editAddress = '';
  editCategory = '其他';
  readonly categories = PRODUCT_CATEGORIES;
  isSaving = false;
  editError = '';

  isUpdatingStatus = false;
  /** 目前買家對這件商品的最新出價狀態；null 代表還沒出價 */
  offerState: OfferStatus | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private chatService: ChatService,
    private toastController: ToastController,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
    public userData: UserDataService,
  ) {
    addIcons({
      heart,
      heartOutline,
      shareOutline,
      createOutline,
      trashOutline,
      checkmarkCircleOutline,
      refreshOutline,
      pricetagOutline,
      chatbubbleEllipsesOutline,
    });
  }

  ngOnInit() {
    this.loadProduct();
  }

  /** 每次重新進入商品頁都刷新出價狀態（Ionic 可能重用同一個頁面實例） */
  ionViewWillEnter() {
    if (this.product) {
      void this.loadOfferState(this.product.id);
    }
  }

  get isFavorite(): boolean {
    return this.product ? this.userData.isFavorite(this.product.id) : false;
  }

  /** 這件商品是不是自己刊登的（有 seller 就以 seller 為準，跨裝置也正確） */
  get isMine(): boolean {
    if (!this.product) {
      return false;
    }

    if (this.product.seller) {
      return this.product.seller === this.auth.username;
    }

    return this.userData.myListingIds.map(Number).includes(Number(this.product.id));
  }

  get isSold(): boolean {
    return this.product?.status === 'sold';
  }

  get isNegotiable(): boolean {
    return Number(this.product?.is_negotiable ?? 0) === 1;
  }

  get showBuyerBar(): boolean {
    return !!this.product && !this.isMine && (this.product.status ?? 'available') === 'available';
  }

  /** 有待回覆或已同意的出價時，不能再出價 */
  get canMakeOffer(): boolean {
    return this.showBuyerBar && this.offerState !== 'pending' && this.offerState !== 'accepted';
  }

  get offerButtonText(): string {
    if (this.offerState === 'pending') {
      return '等待賣家回覆';
    }
    if (this.offerState === 'accepted') {
      return '賣家已同意';
    }

    return this.offerState === 'rejected' ? '再次出價' : '出價';
  }

  async makeOffer() {
    if (!this.product) {
      return;
    }

    if (!this.auth.isLoggedIn) {
      await this.router.navigate(['/login'], {
        queryParams: { redirect: `/product/${this.product.id}` },
      });
      return;
    }

    // 點擊時再向後端確認一次，避免頁面停留太久或初次載入失敗造成狀態過期
    try {
      const state = await this.chatService.offerState(this.product.id);
      this.offerState = state?.status ?? null;
    } catch {
      await this.showToast('無法確認出價狀態，請稍後再試');
      return;
    }

    if (!this.canMakeOffer) {
      await this.showToast(
        this.offerState === 'accepted'
          ? '賣家已同意你的出價，不能再出價'
          : '你已有一個待回覆的出價，請等待賣家回覆',
      );
      return;
    }

    const price = Number(this.product.price);
    const suggested = Math.max(1, Math.floor(price * 0.9));

    const alert = await this.alertController.create({
      header: '出價',
      message: `向「${this.product.title}」的賣家提出你的價格（建議價 HK$ ${suggested}）`,
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

            void this.submitOffer(value);
            return true;
          },
        },
      ],
    });

    await alert.present();
    this.cdr.markForCheck();
  }

  async contactSeller() {
    if (!this.product) {
      return;
    }

    if (!this.auth.isLoggedIn) {
      await this.router.navigate(['/login'], {
        queryParams: { redirect: `/product/${this.product.id}` },
      });
      return;
    }

    try {
      // 每個買家各自一條會話，不再共用商品的聊天室
      const conversationId = await this.chatService.openConversation(this.product.id);
      await this.router.navigate(['/chat', conversationId]);
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '無法開啟對話');
    }
  }

  private async submitOffer(value: number) {
    if (!this.product) {
      return;
    }

    try {
      const conversationId = await this.chatService.openConversation(this.product.id);
      await this.chatService.createOffer(conversationId, value);
      this.offerState = 'pending';
      await this.router.navigate(['/chat', conversationId]);
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '出價失敗');
    }
  }

  async toggleSold() {
    if (!this.product || this.isUpdatingStatus) {
      return;
    }

    const nextStatus = this.isSold ? 'available' : 'sold';

    this.isUpdatingStatus = true;
    this.cdr.markForCheck();

    try {
      await this.productService.updateProduct(this.product.id, {
        title: this.product.title,
        price: Number(this.product.price),
        description: this.product.description ?? '',
        category: this.product.category ?? '其他',
        address: this.product.address ?? '',
        lat: Number(this.product.lat ?? 22.3193),
        lng: Number(this.product.lng ?? 114.1694),
        status: nextStatus,
      });

      this.product.status = nextStatus;
      await this.showToast(nextStatus === 'sold' ? '已標記為售出' : '已重新上架');
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '更新狀態失敗');
    } finally {
      this.isUpdatingStatus = false;
      this.cdr.markForCheck();
    }
  }

  toggleFavorite() {
    if (this.product) {
      this.userData.toggleFavorite(this.product.id);
      this.cdr.markForCheck();
    }
  }

  async share() {
    if (!this.product) {
      return;
    }

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: this.product.title, url });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      await this.showToast('已複製商品連結');
    } catch {
      await this.showToast('無法複製連結');
    }
  }

  openEdit() {
    if (!this.product) {
      return;
    }

    this.editTitle = this.product.title;
    this.editPrice = this.product.price;
    this.editDescription = this.product.description ?? '';
    this.editAddress = this.product.address ?? '';
    this.editCategory = this.product.category ?? '其他';
    this.editError = '';
    this.isEditOpen = true;
  }

  closeEdit() {
    this.isEditOpen = false;
  }

  async saveEdit() {
    if (!this.product) {
      return;
    }

    const title = this.editTitle.trim();
    const rawPrice = String(this.editPrice ?? '').trim();
    const price = Number(rawPrice);

    if (!title) {
      this.editError = '請輸入商品標題';
      return;
    }

    if (rawPrice === '' || Number.isNaN(price) || price < 0) {
      this.editError = '請輸入有效的價格';
      return;
    }

    this.isSaving = true;
    this.editError = '';

    try {
      await this.productService.updateProduct(this.product.id, {
        title,
        price,
        description: this.editDescription.trim(),
        category: this.editCategory,
        address: this.editAddress.trim(),
        lat: Number(this.product.lat ?? 22.3193),
        lng: Number(this.product.lng ?? 114.1694),
        status: this.product.status ?? 'available',
      });

      this.isEditOpen = false;
      await this.loadProduct();
      await this.showToast('商品已更新');
    } catch (error) {
      this.editError = error instanceof Error ? error.message : '更新失敗';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async confirmDelete() {
    if (!this.product) {
      return;
    }

    const alert = await this.alertController.create({
      header: '刪除商品',
      message: `確定要刪除「${this.product.title}」嗎？這個動作無法復原。`,
      buttons: [
        { text: '取消', role: 'cancel' },
        {
          text: '刪除',
          role: 'destructive',
          handler: () => {
            void this.deleteProduct();
          },
        },
      ],
    });

    await alert.present();
  }

  imageUrl(path?: string): string | undefined {
    return this.productService.imageUrl(path);
  }

  async openImagePreview(index: number) {
    if (!this.product) {
      return;
    }

    const paths =
      this.product.images && this.product.images.length > 0
        ? this.product.images
        : this.product.image
          ? [this.product.image]
          : [];

    const sources = paths
      .map((path) => this.imageUrl(path))
      .filter((src): src is string => !!src);

    if (sources.length === 0) {
      return;
    }

    try {
      const dataSource = await Promise.all(
        sources.map(async (src) => ({
          src,
          alt: this.product?.title ?? '',
          ...(await this.loadImageSize(src)),
        })),
      );

      const PhotoSwipeModule = await import('photoswipe');
      const PhotoSwipe = PhotoSwipeModule.default;

      const pswp = new PhotoSwipe({
        dataSource,
        index,
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

  private async deleteProduct() {
    if (!this.product) {
      return;
    }

    try {
      await this.productService.deleteProduct(this.product.id);
      this.userData.removeMyListing(this.product.id);
      await this.router.navigate(['/tabs/home']);
    } catch (error) {
      await this.showToast(error instanceof Error ? error.message : '刪除失敗');
    }
  }

  private async loadProduct() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    // 換商品時先清掉上一件的出價狀態，避免短暫顯示錯誤的按鈕文案
    this.offerState = null;

    try {
      const product = await this.withTimeout(this.productService.getProduct(id), 10000);
      this.product = product;
      this.notFound = !product;

      if (product && this.auth.isLoggedIn && !this.isMine
          && (product.status ?? 'available') === 'available') {
        void this.loadOfferState(product.id);
      }
    } catch (error) {
      console.error('載入商品詳情失敗', error);
      this.notFound = true;
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /** 載入目前買家的最新出價狀態，用來決定「出價」按鈕是否可用 */
  private async loadOfferState(productId: number) {
    try {
      const state = await this.chatService.offerState(productId);
      this.offerState = state?.status ?? null;
    } catch {
      this.offerState = null;
    } finally {
      this.cdr.markForCheck();
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('載入逾時')), ms);
      }),
    ]);
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1500,
      position: 'bottom',
    });

    await toast.present();
  }
}
