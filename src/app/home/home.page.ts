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

  ionViewWillEnter() {
    this.loadProducts();
  }

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
      this.cdr.markForCheck();
    }
  }

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

  toggleFavorite(event: Event, id: number) {
    event.stopPropagation();
    event.preventDefault();
    this.userData.toggleFavorite(id);
  }

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
