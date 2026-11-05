import { Injectable } from '@angular/core';

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
