import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  image?: string;
  images?: string[];
  /** 賣家帳號（刊登時由後端依 token 寫入） */
  seller?: string;
  category?: string;
  address?: string;
  lat?: number;
  lng?: number;
  status?: string;
  condition_label?: string;
  delivery_method?: string;
  is_negotiable?: number | boolean | string;
}

export interface AddProductInput {
  title: string;
  price: number;
  description: string;
  category: string;
  address: string;
  images?: File[];
  lat: number;
  lng: number;
  status?: string;
  condition_label?: string;
  delivery_method?: string;
  is_negotiable?: number | boolean;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  id?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;

  async getProducts(): Promise<Product[]> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<Product[]>>(`${this.baseUrl}/get_products.php`),
    );

    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message ?? '無法取得商品資料');
    }

    return response.data;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const products = await this.getProducts();
    return products.find((product) => Number(product.id) === Number(id));
  }

  imageUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    return path.startsWith('http') ? path : `${this.baseUrl}/${path}`;
  }

  async addProduct(input: AddProductInput): Promise<number | undefined> {
    const form = new FormData();
    form.append('title', input.title);
    form.append('price', String(input.price));
    form.append('description', input.description);
    form.append('category', input.category);
    form.append('address', input.address);
    form.append('lat', String(input.lat));
    form.append('lng', String(input.lng));

    if (input.status) {
      form.append('status', input.status);
    }

    if (input.condition_label) {
      form.append('condition_label', input.condition_label);
    }
    if (input.delivery_method) {
      form.append('delivery_method', input.delivery_method);
    }
    if (input.is_negotiable !== undefined) {
      form.append('is_negotiable', input.is_negotiable ? '1' : '0');
    }

    if (input.images && input.images.length > 0) {
      input.images.forEach((file) => {
        form.append('image[]', file);
      });
    }

    const response = await firstValueFrom(
      this.http.post<ApiResponse<never>>(`${this.baseUrl}/add_product.php`, form, {
        headers: this.auth.authHeaders(),
      }),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '刊登失敗');
    }

    return response.id;
  }

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

    if (input.status) {
      form.append('status', input.status);
    }

    if (input.condition_label) {
      form.append('condition_label', input.condition_label);
    }
    if (input.delivery_method) {
      form.append('delivery_method', input.delivery_method);
    }
    if (input.is_negotiable !== undefined) {
      form.append('is_negotiable', input.is_negotiable ? '1' : '0');
    }

    if (input.images && input.images.length > 0) {
      input.images.forEach((file) => {
        form.append('image[]', file);
      });
    }

    const response = await firstValueFrom(
      this.http.post<ApiResponse<never>>(`${this.baseUrl}/update_product.php`, form, {
        headers: this.auth.authHeaders(),
      }),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '更新失敗');
    }
  }

  async deleteProduct(id: number): Promise<void> {
    const form = new FormData();
    form.append('id', String(id));

    const response = await firstValueFrom(
      this.http.post<ApiResponse<never>>(`${this.baseUrl}/delete_product.php`, form, {
        headers: this.auth.authHeaders(),
      }),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '刪除失敗');
    }
  }
}
