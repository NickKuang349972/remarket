import type { Routes } from '@angular/router';

import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
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
        path: 'auction',
        loadComponent: () =>
          import('./auction/auction-list.page').then((m) => m.AuctionListPage),
      },
      {
        path: 'sell',
        canActivate: [authGuard],
        loadComponent: () => import('./sell/sell.page').then((m) => m.SellPage),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
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
    path: 'chat/:productId',
    canActivate: [authGuard],
    loadComponent: () => import('./chat/chat.page').then((m) => m.ChatPage),
  },
  {
    path: 'auction/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./auction/auction-create.page').then((m) => m.AuctionCreatePage),
  },
  {
    path: 'auction/:id',
    loadComponent: () => import('./auction/auction-room.page').then((m) => m.AuctionRoomPage),
  },
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
  },
];
