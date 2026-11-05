import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
import { PRODUCT_CATEGORIES } from '../models/product-category';

@Component({
  selector: 'app-product-detail',
  templateUrl: 'product-detail.page.html',
  styleUrls: ['product-detail.page.scss'],
  standalone: true,
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private toastController: ToastController,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef,
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

  get isFavorite(): boolean {
    return this.product ? this.userData.isFavorite(this.product.id) : false;
  }

  get isMine(): boolean {
    return this.product
      ? this.userData.myListingIds.map(Number).includes(Number(this.product.id))
      : false;
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

  async makeOffer() {
    if (!this.product) {
      return;
    }

    const alert = await this.alertController.create({
      header: '出價',
      message: `向「${this.product.title}」的賣家提出你的價格`,
      inputs: [
        {
          name: 'price',
          type: 'number',
          placeholder: '輸入你的出價 (HK$)',
          min: 1,
        },
      ],
      buttons: [
        { text: '取消', role: 'cancel' },
        {
          text: '發送出價',
          handler: (data) => {
            const price = Number(data?.price);

            if (!Number.isFinite(price) || price <= 0) {
              void this.showToast('請輸入有效的出價');
              return false;
            }

            void this.sendOffer(price);
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

    const subject = encodeURIComponent(`詢問商品：${this.product.title}`);
    window.location.href = `mailto:seller@remarket.com?subject=${subject}`;

    await this.showToast('已開啟郵件，向賣家查詢');
    this.cdr.markForCheck();
  }

  private async sendOffer(price: number) {
    if (!this.product) {
      return;
    }

    const formatted = price.toLocaleString('en-HK');
    await this.showToast(`已向賣家發送出價 HK$ ${formatted}`);
    this.cdr.markForCheck();
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

    try {
      const product = await this.withTimeout(this.productService.getProduct(id), 10000);
      this.product = product;
      this.notFound = !product;
    } catch (error) {
      console.error('載入商品詳情失敗', error);
      this.notFound = true;
    } finally {
      this.isLoading = false;
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
