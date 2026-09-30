import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  { path: '**', redirectTo: '' },
];
