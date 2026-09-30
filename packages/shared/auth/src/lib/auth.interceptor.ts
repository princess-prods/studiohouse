import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { NEON_AUTH_OPTIONS } from './auth.config';
import { AuthService } from './auth.service';

/**
 * Attaches `Authorization: Bearer <jwt>` to requests bound for our own API.
 * Other requests pass through untouched.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const { apiPrefixes } = inject(NEON_AUTH_OPTIONS);
  if (!apiPrefixes.some((prefix) => req.url.startsWith(prefix))) {
    return next(req);
  }
  const auth = inject(AuthService);
  return from(auth.getToken()).pipe(
    switchMap((token) =>
      next(
        token
          ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
          : req,
      ),
    ),
  );
};
