import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService, NEON_AUTH_CLIENT } from '@studiohouse/auth';
import { MeResponse } from '@studiohouse/models';
import { App } from './app';
import { SessionService } from './core/session.service';
import {
  ME_FIXTURE,
  fakeAuthClient,
  loadSession,
  testProviders,
} from './testing/me.fixture';

const TWO_STUDIOS: MeResponse = {
  ...ME_FIXTURE,
  memberships: [
    ME_FIXTURE.memberships[0],
    {
      studio: { id: 's2', slug: 'other', name: 'Other Studio' },
      role: 'editor',
      brands: [],
    },
  ],
};

async function mount(me: MeResponse = ME_FIXTURE) {
  localStorage.clear();
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      ...testProviders(true),
    ],
  }).compileComponents();
  await TestBed.inject(AuthService).ready();
  await loadSession(me);
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('App shell interactions', () => {
  it('computes initials from an email-only user', async () => {
    const client = fakeAuthClient(true);
    client.getSession = async () => ({
      data: { user: { id: 'u', email: 'jane.doe@example.com', name: null } },
    });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        ...testProviders(true),
        { provide: NEON_AUTH_CLIENT, useValue: client },
      ],
    }).compileComponents();
    await TestBed.inject(AuthService).ready();
    await loadSession();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(
      el.querySelector('[title="jane.doe@example.com"]')?.textContent?.trim(),
    ).toBe('JD');
  });

  it('toggles the colour scheme class on the document', async () => {
    const { el } = await mount();
    const root = document.documentElement;
    root.classList.add('dark');
    const toggle = () =>
      el
        .querySelector<HTMLButtonElement>(
          '[aria-label="Toggle light or dark scheme"]',
        )
        ?.click();
    toggle();
    expect(root.classList.contains('dark')).toBe(false);
    toggle();
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('signs out, clears the session and navigates to sign-in', async () => {
    const { el, fixture } = await mount();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    el.querySelector<HTMLButtonElement>('[aria-label="Sign out"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/sign-in');
    expect(TestBed.inject(SessionService).status()).toBe('idle');
    expect(el.querySelector('aside')).toBeNull();
  });

  it('offers a studio switcher only with several memberships', async () => {
    const { el, fixture } = await mount(TWO_STUDIOS);
    const select = el.querySelector<HTMLSelectElement>(
      'select[aria-label="Switch studio"]',
    );
    expect(select).not.toBeNull();
    expect(select?.options.length).toBe(2);
    if (!select) return;
    select.value = 's2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(TestBed.inject(SessionService).studio()?.name).toBe('Other Studio');
    expect(el.querySelector('aside')?.textContent).toContain('editor');
  });

  it('marks unbuilt sections as coming soon rather than links', async () => {
    const { el } = await mount();
    const soon = el.querySelectorAll('nav [aria-disabled="true"]');
    const links = el.querySelectorAll('nav a');
    expect(soon.length).toBe(9);
    expect(links.length).toBe(1);
    expect(links[0].textContent?.trim()).toBe('Dashboard');
  });
});
