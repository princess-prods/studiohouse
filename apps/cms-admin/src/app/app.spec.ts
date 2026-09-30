import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@studiohouse/auth';
import { App } from './app';
import { ME_FIXTURE, loadSession, testProviders } from './testing/me.fixture';

async function setup(signedIn: boolean) {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([]), ...testProviders(signedIn)],
  }).compileComponents();
  await TestBed.inject(AuthService).ready();
  if (signedIn) await loadSession();
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

  it('shows the active studio and role from the session', async () => {
    const compiled = await setup(true);
    const footer = compiled.querySelector('aside > div:last-child');
    expect(footer?.textContent).toContain(
      ME_FIXTURE.memberships[0].studio.name,
    );
    expect(footer?.textContent).toContain('owner');
    expect(footer?.querySelector('select')).toBeNull();
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
