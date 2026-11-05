import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
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

import { Product, ProductService } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';

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

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    public userData: UserDataService,
  ) {}

  async ionViewWillEnter() {
    let products: Product[] = [];

    try {
      products = await this.productService.getProducts();
    } catch (error) {
      console.error('載入我的資料失敗', error);
    }

    const myIds = this.userData.myListingIds.map(Number);
    const favoriteIds = this.userData.favoriteIds.map(Number);

    this.myProducts = products.filter((product) => myIds.includes(Number(product.id)));
    this.favoriteProducts = products.filter((product) => favoriteIds.includes(Number(product.id)));

    this.cdr.markForCheck();
  }

  imageUrl(path?: string): string | undefined {
    return this.productService.imageUrl(path);
  }
}
