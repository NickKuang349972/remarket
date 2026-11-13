import { computed, Injectable, signal } from '@angular/core';

const FAVORITES_KEY = 'remarket.favorites';
const MY_LISTINGS_KEY = 'remarket.myListings';
const NICKNAME_KEY = 'remarket.nickname';
const CHAT_IDS_KEY = 'remarket.chatProducts';
const LAST_READ_KEY = 'remarket.lastRead';

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private readonly favoriteIdsSignal = signal<number[]>(this.readIds(FAVORITES_KEY));
  private readonly myListingIdsSignal = signal<number[]>(this.readIds(MY_LISTINGS_KEY));
  private readonly chatProductIdsSignal = signal<number[]>(this.readIds(CHAT_IDS_KEY));
  private readonly nicknameSignal = signal<string>(this.readText(NICKNAME_KEY));
  private readonly lastReadSignal = signal<Record<string, number>>(this.readRecord(LAST_READ_KEY));

  /** 某件商品最後一次讀到的訊息 id（用來判斷有沒有新訊息） */
  lastReadOf(productId: number): number {
    return this.lastReadSignal()[String(productId)] ?? 0;
  }

  /** 進入聊天室時更新「已讀到哪裡」 */
  markRead(productId: number, messageId: number) {
    if (messageId <= this.lastReadOf(productId)) {
      return;
    }

    const next = { ...this.lastReadSignal(), [String(productId)]: Number(messageId) };
    this.lastReadSignal.set(next);
    this.writeRecord(LAST_READ_KEY, next);
  }

  /** 使用者的聊天暱稱（未設定時為空字串） */
  get nickname(): string {
    return this.nicknameSignal();
  }

  setNickname(name: string) {
    const value = name.trim();
    this.nicknameSignal.set(value);
    this.writeText(NICKNAME_KEY, value);
  }

  /** 我聊過天的商品 id（新的在前），給「我的」頁列出對話 */
  get chatProductIds(): number[] {
    return this.chatProductIdsSignal();
  }

  addChatProduct(id: number) {
    const numericId = Number(id);
    const current = this.chatProductIdsSignal();

    if (current.includes(numericId)) {
      return;
    }

    const next = [numericId, ...current];
    this.chatProductIdsSignal.set(next);
    this.writeIds(CHAT_IDS_KEY, next);
  }

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

  private readText(key: string): string {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }

  private readRecord(key: string): Record<string, number> {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : {};

      return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
    } catch {
      return {};
    }
  }

  private writeRecord(key: string, value: Record<string, number>) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private writeText(key: string, value: string) {
    localStorage.setItem(key, value);
  }
}
