import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locateOutline } from 'ionicons/icons';
import * as L from 'leaflet';

import { LocationService } from '../services/location.service';
import { Product, ProductService } from '../services/product.service';

@Component({
  selector: 'app-map',
  templateUrl: 'map.page.html',
  styleUrls: ['map.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonFab, IonFabButton, IonIcon],
})
export class MapPage {
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private markerLayer?: L.LayerGroup;
  private userMarker?: L.Marker;

  constructor(
    private productService: ProductService,
    private locationService: LocationService,
    private router: Router,
  ) {
    addIcons({ locateOutline });
  }

  /** 每次進入地圖分頁都重新載入商品，刊登完回來就會多一個標記 */
  async ionViewDidEnter() {
    let products: Product[] = [];

    try {
      products = await this.productService.getProducts();
    } catch (error) {
      console.error('載入地圖商品失敗', error);
    }

    this.ensureMap();
    this.renderMarkers(products);
  }

  /** 第一次進入時建立地圖，之後重複使用同一個實例 */
  private ensureMap() {
    if (!this.map && this.mapContainer) {
      // zoomControl: false → 稍後手動加到右下角，避免被頁首遮住
      this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView(
        [22.3193, 114.1694],
        11,
      );

      L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);
    }

    // 分頁在背景時地圖容器尺寸是 0，回到前景要重新計算
    this.map?.invalidateSize();
  }

  /** 定位到自己的位置（藍點），並把地圖移到那裡 */
  async locateMe() {
    const position = await this.locationService.locate();

    if (!position || !this.map) {
      return;
    }

    this.map.setView([position.lat, position.lng], 14);

    if (this.userMarker) {
      this.userMarker.setLatLng([position.lat, position.lng]);
      return;
    }

    this.userMarker = L.marker([position.lat, position.lng], {
      icon: L.divIcon({
        className: 'me-pin',
        html: '<span></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    })
      .addTo(this.map)
      .bindPopup('你在這裡');
  }

  private renderMarkers(products: Product[]) {
    if (!this.map || !this.markerLayer) {
      return;
    }

    this.markerLayer.clearLayers();

    const points: L.LatLngTuple[] = [];

    for (const product of products) {
      const lat = Number(product.lat);
      const lng = Number(product.lng);

      if (!lat || !lng) {
        continue;
      }

      points.push([lat, lng]);

      const marker = L.marker([lat, lng], { icon: this.pinIcon() }).addTo(this.markerLayer);

      const addressLine = product.address
        ? `<br><span style="color:#6b7a70">📍 ${this.escapeHtml(product.address)}</span>`
        : '';

      marker.bindPopup(
        `<strong>${this.escapeHtml(product.title)}</strong><br>HK$ ${product.price}${addressLine}`,
      );

      marker.on('click', () => {
        void this.router.navigate(['/product', product.id]);
      });
    }

    if (points.length > 0) {
      this.map.fitBounds(L.latLngBounds(points).pad(0.25));
    }
  }

  /** 用 CSS 畫一個綠色圓點，避免 Leaflet 預設圖示在打包後路徑失效 */
  private pinIcon(): L.DivIcon {
    return L.divIcon({
      className: 'remarket-pin',
      html: '<span></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
