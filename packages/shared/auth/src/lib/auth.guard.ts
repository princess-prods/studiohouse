import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NEON_AUTH_OPTIONS } from './auth.config';
import { AuthService } from './auth.service';

/** Allows navigation only for signed-in users; otherwise redirects to the sign-in page. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const { signInPath } = inject(NEON_AUTH_OPTIONS);

  await auth.ready();
  if (auth.isSignedIn()) return true;
  return router.createUrlTree([signInPath], {
    queryParams: { returnTo: state.url },
  });
};

/** The inverse: keeps signed-in users away from the sign-in page. */
export const signedOutGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready();
  return auth.isSignedIn() ? router.createUrlTree(['/']) : true;
};
