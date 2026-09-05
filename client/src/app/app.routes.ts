import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./booking/booking').then((m) => m.BookingComponent),
  },
];
