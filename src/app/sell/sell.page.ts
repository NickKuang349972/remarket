import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { GeocodingService } from '../services/geocoding.service';
import { ProductService } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';
import { PRODUCT_CATEGORIES } from '../models/product-category';

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
    IonSelect,
    IonSelectOption,
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
  readonly categories = PRODUCT_CATEGORIES;
  category = '其他';

  imageFile: File | null = null;
  imagePreview: string | null = null;

  lat: number | null = null;
  lng: number | null = null;
  isLocating = false;
  /** 賣家填的地區名，例如「旺角」 */
  addressText = '';
  isLookingUpAddress = false;

  isSubmitting = false;
  errorMessage = '';

  constructor(
    private productService: ProductService,
    private userData: UserDataService,
    private geocoding: GeocodingService,
    private cdr: ChangeDetectorRef,
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
        this.cdr.markForCheck();

        // 順便把經緯度轉成地區名，讓賣家不用自己打
        void this.lookupAddress(this.lat, this.lng);
      },
      () => {
        this.isLocating = false;
        this.errorMessage = '無法取得位置，請允許瀏覽器使用定位';
        this.cdr.markForCheck();
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /** 用座標反查地區名；如果賣家已經自己打了，就不覆蓋 */
  private async lookupAddress(lat: number, lng: number) {
    this.isLookingUpAddress = true;
    this.cdr.markForCheck();

    const address = await this.geocoding.reverse(lat, lng);

    if (address && !this.addressText.trim()) {
      this.addressText = address;
    }

    this.isLookingUpAddress = false;
    this.cdr.markForCheck();
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
      const newProductId = await this.productService.addProduct({
        title,
        price,
        description: this.description.trim(),
        category: this.category,
        address: this.addressText.trim(),
        image: this.imageFile,
        lat: this.lat ?? 22.3193,
        lng: this.lng ?? 114.1694,
      });

      // 記住這件是自己刊登的，之後在「我的」頁可以列出
      if (newProductId) {
        this.userData.addMyListing(newProductId);
      }

      this.resetForm();
      await this.router.navigate(['/tabs/home']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : '刊登失敗，請稍後再試';
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  private resetForm() {
    this.title = '';
    this.priceText = '';
    this.description = '';
    this.addressText = '';
    this.category = '其他';
    this.imageFile = null;

    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }

    this.imagePreview = null;
    this.lat = null;
    this.lng = null;
  }
}
