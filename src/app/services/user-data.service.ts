import { computed, Injectable, signal } from '@angular/core';

const FAVORITES_KEY = 'remarket.favorites';
const MY_LISTINGS_KEY = 'remarket.myListings';

/**
 * 把「使用者自己的資料」存在瀏覽器（localStorage）。
 * 目前未有會員系統，所以收藏和自己的刊登都先記在本機；
 * 日後加入登入功能時，只需把這個 service 換成打 API。
 */
@Injectable({ providedIn: 'root' })
export class UserDataService {
  private readonly favoriteIdsSignal = signal<number[]>(this.readIds(FAVORITES_KEY));
  private readonly myListingIdsSignal = signal<number[]>(this.readIds(MY_LISTINGS_KEY));

  /** 收藏數量（給「我的」頁顯示） */
  readonly favoritesCount = computed(() => this.favoriteIdsSignal().length);

  get favoriteIds(): number[] {
    return this.favoriteIdsSignal();
  }

  get myListingIds(): number[] {
    return this.myListingIdsSignal();
  }

  isFavorite(id: number): boolean {
    return this.favoriteIdsSignal().includes(Number(id));
  }

  /** 切換收藏，回傳切換後是否已收藏 */
  toggleFavorite(id: number): boolean {
    const numericId = Number(id);
    const current = this.favoriteIdsSignal();
    const next = current.includes(numericId)
      ? current.filter((item) => item !== numericId)
      : [...current, numericId];

    this.favoriteIdsSignal.set(next);
    this.writeIds(FAVORITES_KEY, next);

    return next.includes(numericId);
  }

  /** 刊登成功後記下這件商品是自己發佈的 */
  addMyListing(id: number) {
    const numericId = Number(id);
    const current = this.myListingIdsSignal();

    if (current.includes(numericId)) {
      return;
    }

    const next = [numericId, ...current];
    this.myListingIdsSignal.set(next);
    this.writeIds(MY_LISTINGS_KEY, next);
  }

  /** 刪除商品後，把它從「我的刊登」移除 */
  removeMyListing(id: number) {
    const numericId = Number(id);
    const next = this.myListingIdsSignal().filter((item) => item !== numericId);

    this.myListingIdsSignal.set(next);
    this.writeIds(MY_LISTINGS_KEY, next);
  }

  private readIds(key: string): number[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }

  private writeIds(key: string, ids: number[]) {
    localStorage.setItem(key, JSON.stringify(ids));
  }
}
