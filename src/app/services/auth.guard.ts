import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';

/** 未登入就送去登入頁；登入後回到原本想去的頁面 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};
