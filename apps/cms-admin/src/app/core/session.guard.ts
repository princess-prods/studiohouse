import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SessionService } from './session.service';

/**
 * Loads the studio context before the shell renders. Runs after `authGuard`.
 * Failures do not block navigation; the shell shows the error state instead.
 */
export const sessionGuard: CanActivateFn = async () => {
  await inject(SessionService).load();
  return true;
};
