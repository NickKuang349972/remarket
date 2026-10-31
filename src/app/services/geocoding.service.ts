import { Injectable } from '@angular/core';

/**
 * 用 OpenStreetMap 的 Nominatim 服務，把經緯度轉成「地區名」。
 * 例如 22.3193, 114.1694 → 「旺角」
 * 免費服務，有使用頻率限制，所以只在按下定位時呼叫一次。
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  async reverse(lat: number, lng: number): Promise<string> {
    const url =
      'https://nominatim.openstreetmap.org/reverse' +
      `?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=zh-hant`;

    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });

      if (!response.ok) {
        return '';
      }

      const data = (await response.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };

      const address = data.address ?? {};

      return (
        address['suburb'] ||
        address['neighbourhood'] ||
        address['city_district'] ||
        address['town'] ||
        address['city'] ||
        data.display_name ||
        ''
      );
    } catch {
      return '';
    }
  }
}
