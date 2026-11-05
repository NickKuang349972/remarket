import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, close } from 'ionicons/icons';

import { GeocodingService } from '../services/geocoding.service';
import { ProductService } from '../services/product.service';
import { UserDataService } from '../services/user-data.service';
import { PRODUCT_CATEGORIES } from '../models/product-category';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
    IonIcon,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToggle,
    IonButton,
    IonSpinner,
  ],
})
export class SellPage {
  title = '';
  priceText: string | number = '';
  description = '';
  readonly categories = PRODUCT_CATEGORIES;
  category = '其他';

  readonly conditionOptions = ['全新未拆', '99新', '轻微使用痕迹', '明显使用痕迹', '有破损'];
  readonly deliveryOptions = ['面交', '顺丰快递', '平邮'];
  conditionLabel = '轻微使用痕迹';
  deliveryMethod = '面交';
  isNegotiable = false;

  readonly MAX_PHOTOS = 8;
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  photoError = '';

  lat: number | null = null;
  lng: number | null = null;
  isLocating = false;
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
  ) {
    addIcons({ close, cameraOutline });
  }

  get isPhotoFull(): boolean {
    return this.imageFiles.length >= this.MAX_PHOTOS;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    this.photoError = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (this.imageFiles.length >= this.MAX_PHOTOS) {
        this.photoError = `最多只能加入 ${this.MAX_PHOTOS} 張相片`;
        break;
      }

      if (!file.type.startsWith('image/')) {
        this.photoError = `「${file.name}」不是圖片，已略過`;
        continue;
      }

      if (file.size > MAX_PHOTO_BYTES) {
        this.photoError = `「${file.name}」超過 5MB，已略過`;
        continue;
      }

      this.imageFiles.push(file);
      this.imagePreviews.push(URL.createObjectURL(file));
    }

    input.value = '';
    this.cdr.markForCheck();
  }

  removeImage(index: number) {
    URL.revokeObjectURL(this.imagePreviews[index]);
    this.imagePreviews.splice(index, 1);
    this.imageFiles.splice(index, 1);
    this.photoError = '';
    this.cdr.markForCheck();
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
        condition_label: this.conditionLabel,
        delivery_method: this.deliveryMethod,
        is_negotiable: this.isNegotiable,
        images: this.imageFiles,
        lat: this.lat ?? 22.3193,
        lng: this.lng ?? 114.1694,
      });

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

    this.conditionLabel = '轻微使用痕迹';
    this.deliveryMethod = '面交';
    this.isNegotiable = false;

    this.imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    this.imageFiles = [];
    this.imagePreviews = [];
    this.photoError = '';

    this.lat = null;
    this.lng = null;
  }
}
