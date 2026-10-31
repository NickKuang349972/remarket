import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonImg,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { Product, ProductService } from '../services/product.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: 'product-detail.page.html',
  styleUrls: ['product-detail.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonImg,
    IonSkeletonText,
  ],
})
export class ProductDetailPage {
  product?: Product;
  isLoading = true;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
  ) {}

  ionViewWillEnter() {
    this.loadProduct();
  }

  private async loadProduct() {    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      this.product = await this.productService.getProduct(id);
      this.notFound = !this.product;
    } catch (error) {
      console.error('載入商品詳情失敗', error);
      this.notFound = true;
    } finally {
      this.isLoading = false;
    }
  }

  imageUrl(path?: string): string | undefined {
    return this.productService.imageUrl(path);
  }
}
