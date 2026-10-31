import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'map',
        loadComponent: () => import('./map/map.page').then((m) => m.MapPage),
      },
      {
        path: 'sell',
        loadComponent: () => import('./sell/sell.page').then((m) => m.SellPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./product-detail/product-detail.page').then((m) => m.ProductDetailPage),
  },
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
  },
];
