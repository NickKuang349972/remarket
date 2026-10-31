import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonImg,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { Product, ProductService } from '../services/product.service';

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
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    IonImg,
    IonSkeletonText,
  ],
})
export class HomePage {
  products: Product[] = [];
  searchText = '';
  isLoading = true;
  hasError = false;

  constructor(private productService: ProductService) {}

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
    }
  }

  /** 依搜尋字串篩選（標題或描述包含關鍵字） */
  get filteredProducts(): Product[] {
    const keyword = this.searchText.trim().toLowerCase();
    if (!keyword) {
      return this.products;
    }

    return this.products.filter(
      (product) =>
        product.title.toLowerCase().includes(keyword) ||
        (product.description ?? '').toLowerCase().includes(keyword),
    );
  }

  onSearch(event: Event) {
    this.searchText = (event as CustomEvent<{ value: string | null }>).detail.value ?? '';
  }

  imageUrl(path?: string): string | undefined {
    return this.productService.imageUrl(path);
  }
}
