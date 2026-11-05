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

const LARGE_PIN_ZOOM = 14;

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#f0ddd2"/>' +
      '<circle cx="32" cy="27" r="9" fill="none" stroke="#a9502f" stroke-width="3"/>' +
      '<rect x="17" y="42" width="30" height="5" rx="2.5" fill="#a9502f" opacity="0.45"/>' +
      '</svg>',
  );

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
  private products: Product[] = [];
  private renderedZoom?: number;

  constructor(
    private productService: ProductService,
    private locationService: LocationService,
    private router: Router,
  ) {
    addIcons({ locateOutline });
  }

  async ionViewDidEnter() {
    let products: Product[] = [];

    try {
      products = await this.productService.getProducts();
    } catch (error) {
      console.error('載入地圖商品失敗', error);
    }

    this.products = products.filter(
      (product) => (product.status ?? 'available') === 'available',
    );

    this.ensureMap();
    this.renderMarkers(this.products, true);
  }

  private ensureMap() {
    if (!this.map && this.mapContainer) {
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

      this.map.on('zoomend', () => this.handleZoomEnd());
    }

    this.map?.invalidateSize();
  }

  private handleZoomEnd() {
    if (!this.map) {
      return;
    }

    const zoom = this.map.getZoom();

    if (zoom === this.renderedZoom) {
      return;
    }

    this.renderMarkers(this.products);
  }

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

  private renderMarkers(products: Product[], fitToPoints = false) {
    if (!this.map || !this.markerLayer) {
      return;
    }

    this.markerLayer.clearLayers();

    const zoom = this.map.getZoom();
    this.renderedZoom = zoom;
    const useLargePin = zoom >= LARGE_PIN_ZOOM;

    const points: L.LatLngTuple[] = [];

    for (const product of products) {
      const lat = Number(product.lat);
      const lng = Number(product.lng);

      if (!lat || !lng) {
        continue;
      }

      points.push([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: useLargePin
          ? this.largePinIcon(this.bubbleImage(product), product.price)
          : this.smallPinIcon(),
      }).addTo(this.markerLayer);

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

    if (fitToPoints && points.length > 0) {
      this.map.fitBounds(L.latLngBounds(points).pad(0.25));
    }
  }

  private smallPinIcon(): L.DivIcon {
    return L.divIcon({
      className: 'remarket-pin',
      html: '<span></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  private largePinIcon(imageUrl: string, price: number): L.DivIcon {
    const safeUrl = this.escapeHtml(imageUrl);

    return L.divIcon({
      className: 'remarket-pin-large',
      html: `<div class="bubble"><img src="${safeUrl}" alt="" draggable="false" /><span class="price">HK$ ${price}</span></div>`,
      iconSize: [64, 64],
      iconAnchor: [32, 64],
    });
  }

  private bubbleImage(product: Product): string {
    return this.productService.imageUrl(product.image) ?? PLACEHOLDER_IMAGE;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
