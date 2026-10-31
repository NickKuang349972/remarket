import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

/** 一件二手商品（對應 MySQL 的 products 資料表） */
export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  /** 圖片路徑，例如 http://localhost/remarket-backend/uploads/xxx.jpg */
  image?: string;
  /** 商品分類，例如「電子產品」「傢俬」 */
  category?: string;
  /** 賣家填寫的地區名，例如「旺角」 */
  address?: string;
  lat?: number;
  lng?: number;
}

/** 刊登新商品時需要的資料 */
export interface AddProductInput {
  title: string;
  price: number;
  description: string;
  category: string;
  address: string;
  image?: File | null;
  lat: number;
  lng: number;
}

/** 後端統一回傳格式：{ status: 'success' | 'error', data?, message?, id? } */
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  /** add_product.php 成功時會回傳新商品的 id */
  id?: number;
}

/**
 * 所有商品相關的 API 呼叫都集中在這裡，
 * 頁面不需要知道自己打的是哪個 PHP 檔。
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /** 取得所有商品（新到舊） */
  async getProducts(): Promise<Product[]> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<Product[]>>(`${this.baseUrl}/get_products.php`),
    );

    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message ?? '無法取得商品資料');
    }

    return response.data;
  }

  /**
   * 依 id 取得單一商品。
   * 目前後端還未有單筆查詢 API，所以先抓全部再篩選；
   * 之後加上 get_product.php 後只需改這個方法。
   */
  async getProduct(id: number): Promise<Product | undefined> {
    const products = await this.getProducts();
    return products.find((product) => Number(product.id) === Number(id));
  }

  /** 把資料庫存的相對路徑（uploads/xxx.jpg）轉成完整網址 */
  imageUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    return path.startsWith('http') ? path : `${this.baseUrl}/${path}`;
  }

  /** 新增商品：以 multipart/form-data 送出，可附帶一張相片；成功時回傳新商品 id */
  async addProduct(input: AddProductInput): Promise<number | undefined> {
    const form = new FormData();
    form.append('title', input.title);
    form.append('price', String(input.price));
    form.append('description', input.description);
    form.append('category', input.category);
    form.append('address', input.address);
    form.append('lat', String(input.lat));
    form.append('lng', String(input.lng));

    if (input.image) {
      form.append('image', input.image);
    }

    const response = await firstValueFrom(
      this.http.post<ApiResponse<never>>(`${this.baseUrl}/add_product.php`, form),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '刊登失敗');
    }

    return response.id;
  }

  /** 更新商品資料（可選擇換一張相片） */
  async updateProduct(id: number, input: AddProductInput): Promise<void> {
    const form = new FormData();
    form.append('id', String(id));
    form.append('title', input.title);
    form.append('price', String(input.price));
    form.append('description', input.description);
    form.append('category', input.category);
    form.append('address', input.address);
    form.append('lat', String(input.lat));
    form.append('lng', String(input.lng));

    if (input.image) {
      form.append('image', input.image);
    }

    const response = await firstValueFrom(
      this.http.post<ApiResponse<never>>(`${this.baseUrl}/update_product.php`, form),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '更新失敗');
    }
  }

  /** 刪除商品 */
  async deleteProduct(id: number): Promise<void> {
    const form = new FormData();
    form.append('id', String(id));

    const response = await firstValueFrom(
      this.http.post<ApiResponse<never>>(`${this.baseUrl}/delete_product.php`, form),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '刪除失敗');
    }
  }
}
