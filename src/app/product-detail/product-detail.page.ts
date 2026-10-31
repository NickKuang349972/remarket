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
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, heart, heartOutline, shareOutline, trashOutline } from 'ionicons/icons';

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

  // 編輯表單
  isEditOpen = false;
  editTitle = '';
  editPrice: string | number = '';
  editDescription = '';
  editAddress = '';
  editCategory = '其他';
  readonly categories = PRODUCT_CATEGORIES;
  isSaving = false;
  editError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private toastController: ToastController,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef,
    public userData: UserDataService,
  ) {
    addIcons({ heart, heartOutline, shareOutline, createOutline, trashOutline });
  }

  ngOnInit() {
    this.loadProduct();
  }

  get isFavorite(): boolean {
    return this.product ? this.userData.isFavorite(this.product.id) : false;
  }

  /** 這件商品是不是自己刊登的（決定要不要顯示編輯／刪除） */
  get isMine(): boolean {
    return this.product
      ? this.userData.myListingIds.map(Number).includes(Number(this.product.id))
      : false;
  }

  toggleFavorite() {
    if (this.product) {
      this.userData.toggleFavorite(this.product.id);
      this.cdr.markForCheck();
    }
  }

  /** 分享商品：手機支援系統分享面板，否則複製連結 */
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
      // 無 zone 模式：async 之後要主動通知 Angular 重畫
      this.cdr.markForCheck();
    }
  }

  /** 保險：超過指定時間就當作失敗，避免畫面永遠停在載入中 */
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
