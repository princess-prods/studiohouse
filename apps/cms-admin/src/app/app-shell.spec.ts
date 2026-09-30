import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AuthService,
  NEON_AUTH_CLIENT,
  NeonAuthClient,
  provideNeonAuth,
} from '@studiohouse/auth';
import { STUDIOHOUSE_THEME, provideColorTheme } from '@studiohouse/ui';
import { App } from './app';

function client(user: { id: string; email: string; name?: string | null }) {
  let signedIn = true;
  const c: NeonAuthClient & { signOutCalls: number } = {
    signOutCalls: 0,
    signIn: { email: async () => ({ error: null }) },
    signUp: { email: async () => ({ error: null }) },
    signOut: async () => {
      c.signOutCalls++;
      signedIn = false;
    },
    getSession: async () => ({ data: signedIn ? { user } : null }),
    token: async () => ({ data: { token: 'jwt' } }),
  };
  return c;
}

async function mount(user: Parameters<typeof client>[0]) {
  const authClient = client(user);
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
      { provide: NEON_AUTH_CLIENT, useValue: authClient },
      provideColorTheme(STUDIOHOUSE_THEME),
    ],
  }).compileComponents();
  await TestBed.inject(AuthService).ready();
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement, authClient };
}

describe('App shell interactions', () => {
  it('derives initials from the email when there is no name', async () => {
    const { el } = await mount({ id: 'u', email: 'jane.doe@example.com' });
    expect(
      el.querySelector('[title="jane.doe@example.com"]')?.textContent?.trim(),
    ).toBe('JD');
  });

  it('toggles the colour scheme class on the document', async () => {
    const { el } = await mount({ id: 'u', email: 'o@x.test', name: 'Owner' });
    const root = document.documentElement;
    root.classList.add('dark');
    el.querySelector<HTMLButtonElement>(
      '[aria-label="Toggle light or dark scheme"]',
    )?.click();
    expect(root.classList.contains('dark')).toBe(false);
    el.querySelector<HTMLButtonElement>(
      '[aria-label="Toggle light or dark scheme"]',
    )?.click();
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('signs out and navigates to the sign-in page', async () => {
    const { el, fixture, authClient } = await mount({
      id: 'u',
      email: 'o@x.test',
      name: 'Owner',
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    el.querySelector<HTMLButtonElement>('[aria-label="Sign out"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(authClient.signOutCalls).toBe(1);
    expect(navigate).toHaveBeenCalledWith('/sign-in');
    expect(el.querySelector('aside')).toBeNull();
  });

  it('marks unbuilt sections as coming soon rather than links', async () => {
    const { el } = await mount({ id: 'u', email: 'o@x.test', name: 'Owner' });
    const soon = el.querySelectorAll('nav [aria-disabled="true"]');
    const links = el.querySelectorAll('nav a');
    expect(soon.length).toBe(9);
    expect(links.length).toBe(1);
    expect(links[0].textContent?.trim()).toBe('Dashboard');
  });
});
