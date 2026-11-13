import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuctionService } from '../services/auction.service';
import { AuthService } from '../services/auth.service';
import { Product, ProductService } from '../services/product.service';

@Component({
  selector: 'app-auction-create',
  templateUrl: 'auction-create.page.html',
  styleUrls: ['auction-create.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonSpinner,
  ],
})
export class AuctionCreatePage implements OnInit {
  myProducts: Product[] = [];
  selectedProductId = 0;
  startAt = '';
  endAt = '';
  startPrice: string | number = '';
  minIncrement: string | number = 10;

  isLoading = true;
  isSubmitting = false;
  error = '';

  constructor(
    private auctionService: AuctionService,
    private productService: ProductService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    const start = new Date(Date.now() + 10 * 60 * 1000);
    const end = new Date(Date.now() + 60 * 60 * 1000);

    this.startAt = this.toInputValue(start);
    this.endAt = this.toInputValue(end);

    try {
      const products = await this.productService.getProducts();
      this.myProducts = products.filter((product) => product.seller === this.auth.username);

      if (this.myProducts.length > 0) {
        this.selectedProductId = Number(this.myProducts[0].id);
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : '無法載入商品';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async submit() {
    this.error = '';

    const startPrice = Number(String(this.startPrice).trim());
    const minIncrement = Number(String(this.minIncrement).trim());

    if (!this.selectedProductId) {
      this.error = '請選擇要拍賣的商品';
      return;
    }
    if (!this.startAt || !this.endAt) {
      this.error = '請設定開始與結束時間';
      return;
    }
    if (!Number.isFinite(startPrice) || startPrice <= 0) {
      this.error = '請輸入有效的起標價';
      return;
    }
    if (!Number.isFinite(minIncrement) || minIncrement <= 0) {
      this.error = '請輸入有效的最低加價';
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    try {
      const id = await this.auctionService.create({
        productId: this.selectedProductId,
        startAt: this.startAt,
        endAt: this.endAt,
        startPrice,
        minIncrement,
      });

      if (id) {
        await this.router.navigate(['/auction', id], { replaceUrl: true });
        return;
      }

      this.error = '建立失敗';
    } catch (error) {
      this.error = error instanceof Error ? error.message : '建立拍賣失敗';
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  private toInputValue(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  }
}
