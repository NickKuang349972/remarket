import { Injectable, signal } from '@angular/core';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 位置相關工具：取得目前位置 + 計算兩點距離。
 * 「附近優先」排序和地圖定位都用這個 service。
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  /** 目前位置；未定位時為 null */
  readonly current = signal<Coordinates | null>(null);

  /** 向瀏覽器要求定位；使用者拒絕或逾時就回傳 null */
  async locate(): Promise<Coordinates | null> {
    if (!navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          this.current.set(coordinates);
          resolve(coordinates);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  /** Haversine 公式：回傳兩點的直線距離（公里） */
  distanceKm(from: Coordinates, to: Coordinates): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRadians(from.lat)) *
        Math.cos(this.toRadians(to.lat)) *
        Math.sin(dLng / 2) ** 2;

    return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
