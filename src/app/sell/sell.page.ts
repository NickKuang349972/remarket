import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-sell',
  templateUrl: 'sell.page.html',
  styleUrls: ['sell.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonTextarea,
    IonButton,
    IonSpinner,
  ],
})
export class SellPage {
  title = '';
  /** type="number" 的 ion-input 會回傳 number，所以這裡兩種型別都要接受 */
  priceText: string | number = '';
  description = '';

  imageFile: File | null = null;
  imagePreview: string | null = null;

  lat: number | null = null;
  lng: number | null = null;
  isLocating = false;

  isSubmitting = false;
  errorMessage = '';

  constructor(
    private productService: ProductService,
    private router: Router,
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.imageFile = file;

    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }

    this.imagePreview = file ? URL.createObjectURL(file) : null;
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.errorMessage = '這個瀏覽器不支援定位功能';
      return;
    }

    this.isLocating = true;
    this.errorMessage = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
        this.isLocating = false;
      },
      () => {
        this.isLocating = false;
        this.errorMessage = '無法取得位置，請允許瀏覽器使用定位';
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async submit() {
    this.errorMessage = '';

    const title = this.title.trim();
    const rawPrice = String(this.priceText ?? '').trim();
    const price = Number(rawPrice);

    if (!title) {
      this.errorMessage = '請輸入商品標題';
      return;
    }

    if (rawPrice === '' || Number.isNaN(price) || price < 0) {
      this.errorMessage = '請輸入有效的價格';
      return;
    }

    this.isSubmitting = true;

    try {
      await this.productService.addProduct({
        title,
        price,
        description: this.description.trim(),
        image: this.imageFile,
        lat: this.lat ?? 22.3193,
        lng: this.lng ?? 114.1694,
      });

      this.resetForm();
      await this.router.navigate(['/tabs/home']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : '刊登失敗，請稍後再試';
    } finally {
      this.isSubmitting = false;
    }
  }

  private resetForm() {
    this.title = '';
    this.priceText = '';
    this.description = '';
    this.imageFile = null;

    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }

    this.imagePreview = null;
    this.lat = null;
    this.lng = null;
  }
}
