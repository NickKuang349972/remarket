import { Component } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
  ],
})
export class ProfilePage {
  productCount = 0;

  constructor(private productService: ProductService) {}

  async ionViewWillEnter() {
    try {
      this.productCount = (await this.productService.getProducts()).length;
    } catch {
      this.productCount = 0;
    }
  }
}
