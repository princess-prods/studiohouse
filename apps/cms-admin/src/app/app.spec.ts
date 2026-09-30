import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AuthService,
  NEON_AUTH_CLIENT,
  NeonAuthClient,
  provideNeonAuth,
} from '@studiohouse/auth';
import { STUDIOHOUSE_THEME, provideColorTheme } from '@studiohouse/ui';
import { App } from './app';

function fakeClient(signedIn: boolean): NeonAuthClient {
  return {
    signIn: { email: async () => ({ error: null }) },
    signUp: { email: async () => ({ error: null }) },
    signOut: async () => undefined,
    getSession: async () => ({
      data: signedIn
        ? { user: { id: 'u1', email: 'owner@example.com', name: 'Owner One' } }
        : null,
    }),
    token: async () => ({ data: { token: 'jwt' } }),
  };
}

async function setup(signedIn: boolean) {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
      { provide: NEON_AUTH_CLIENT, useValue: fakeClient(signedIn) },
      provideColorTheme(STUDIOHOUSE_THEME),
    ],
  }).compileComponents();
  await TestBed.inject(AuthService).ready();
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('App', () => {
  it('renders the Studiohouse shell with navigation when signed in', async () => {
    const compiled = await setup(true);
    expect(compiled.querySelector('aside')?.textContent).toContain('house');
    const labels = Array.from(compiled.querySelectorAll('nav li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Brands');
    expect(
      compiled
        .querySelector('[title="owner@example.com"]')
        ?.textContent?.trim(),
    ).toBe('OO');
  });

  it('renders only the outlet when signed out', async () => {
    const compiled = await setup(false);
    expect(compiled.querySelector('aside')).toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('wears the product theme, not a brand theme', async () => {
    await setup(true);
    expect(document.documentElement.dataset['theme']).toBe('studiohouse');
  });
});
