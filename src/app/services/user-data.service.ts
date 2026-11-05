import { computed, Injectable, signal } from '@angular/core';

const FAVORITES_KEY = 'remarket.favorites';
const MY_LISTINGS_KEY = 'remarket.myListings';

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private readonly favoriteIdsSignal = signal<number[]>(this.readIds(FAVORITES_KEY));
  private readonly myListingIdsSignal = signal<number[]>(this.readIds(MY_LISTINGS_KEY));

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
}
