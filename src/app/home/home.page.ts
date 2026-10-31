import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonImg,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heart, heartOutline } from 'ionicons/icons';

import { Product, ProductService } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';
import { LocationService } from '../services/location.service';
import { PRODUCT_CATEGORIES } from '../models/product-category';

type SortOption = 'new' | 'priceAsc' | 'priceDesc' | 'distance';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    IonChip,
    IonImg,
    IonButton,
    IonIcon,
    IonSkeletonText,
  ],
})
export class HomePage {
  products: Product[] = [];
  searchText = '';
  sortBy: SortOption = 'new';
  selectedCategory = '全部';
  readonly categories = ['全部', ...PRODUCT_CATEGORIES];
  isLoading = true;
  hasError = false;

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    private toastController: ToastController,
    public userData: UserDataService,
    public locationService: LocationService,
  ) {
    addIcons({ heart, heartOutline });
  }

  /** Ionic 生命週期：每次進入此頁都會執行（刊登新商品後回來會自動更新） */
  ionViewWillEnter() {
    this.loadProducts();
  }

  /** 從 PHP 後端載入商品；傳入 event 時代表是下拉刷新 */
  async loadProducts(event?: CustomEvent) {
    this.hasError = false;

    try {
      this.products = await this.productService.getProducts();
    } catch (error) {
      console.error('載入商品失敗', error);
      this.hasError = true;
    } finally {
      this.isLoading = false;
      (event?.target as HTMLIonRefresherElement | null)?.complete();
      // 這個專案沒有 zone.js（zoneless），async 之後要通知 Angular 重畫
      this.cdr.markForCheck();
    }
  }

  /** 先依分類篩選，再依搜尋字串，最後排序 */
  get filteredProducts(): Product[] {
    const keyword = this.searchText.trim().toLowerCase();

    const list = this.products.filter((product) => {
      const matchCategory =
        this.selectedCategory === '全部' || product.category === this.selectedCategory;
      const matchKeyword =
        !keyword ||
        product.title.toLowerCase().includes(keyword) ||
        (product.description ?? '').toLowerCase().includes(keyword);

      return matchCategory && matchKeyword;
    });

    switch (this.sortBy) {
      case 'priceAsc':
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case 'priceDesc':
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case 'distance':
        return list.sort((a, b) => this.distanceOf(a) - this.distanceOf(b));
      default:
        return list;
    }
  }

  onSearch(event: Event) {
    this.searchText = (event as CustomEvent<{ value: string | null }>).detail.value ?? '';
  }

  onSortChange(event: Event) {
    const value = (event as CustomEvent<{ value: SortOption }>).detail.value;

    if (value === 'distance') {
      void this.sortByDistance();
      return;
    }

    this.sortBy = value;
  }

  /** 按距離排序前先定位；使用者拒絕就退回「最新」 */
  private async sortByDistance() {
    const position = await this.locationService.locate();

    if (!position) {
      this.sortBy = 'new';
      this.cdr.markForCheck();

      const toast = await this.toastController.create({
        message: '無法取得你的位置，已改回「最新」',
        duration: 1800,
        position: 'bottom',
      });
      await toast.present();
      return;
    }

    this.sortBy = 'distance';
    this.cdr.markForCheck();
  }

  /** 距離（公里），未定位或商品沒有座標時回傳 Infinity，排序時排到最後 */
  private distanceOf(product: Product): number {
    const me = this.locationService.current();

    if (!me || !product.lat || !product.lng) {
      return Number.POSITIVE_INFINITY;
    }

    return this.locationService.distanceKm(me, {
      lat: Number(product.lat),
      lng: Number(product.lng),
    });
  }

  /** 卡片上顯示的距離文字，例如「1.2 km」或「450 m」 */
  distanceText(product: Product): string {
    const distance = this.distanceOf(product);

    if (!Number.isFinite(distance)) {
      return '';
    }

    return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  /** 按愛心時不要觸發卡片的點擊（不要跳去詳情頁） */
  toggleFavorite(event: Event, id: number) {
    event.stopPropagation();
    event.preventDefault();
    this.userData.toggleFavorite(id);
  }

  /** 卡片底部的資訊列：地區 + 距離 */
  metaText(product: Product): string {
    const parts: string[] = [];

    if (product.address) {
      parts.push(`📍 ${product.address}`);
    }

    const distance = this.distanceText(product);
    if (distance) {
      parts.push(distance);
    }

    return parts.join(' · ');
  }

  imageUrl(path?: string): string | undefined {
    return this.productService.imageUrl(path);
  }
}
