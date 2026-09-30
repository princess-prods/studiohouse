import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthError, AuthService } from '@studiohouse/auth';

type Mode = 'sign-in' | 'sign-up';

@Component({
  imports: [
    FormsModule,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  selector: 'cms-sign-in',
  templateUrl: './sign-in.html',
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly mode = signal<Mode>('sign-in');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected name = '';
  protected email = '';
  protected password = '';

  protected toggleMode(): void {
    this.mode.update((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'sign-in') {
        await this.auth.signIn(this.email, this.password);
      } else {
        await this.auth.signUp(this.name, this.email, this.password);
      }
      const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
      await this.router.navigateByUrl(
        returnTo?.startsWith('/') ? returnTo : '/',
      );
    } catch (err) {
      this.error.set(
        err instanceof AuthError
          ? err.message
          : 'Something went wrong. Try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
