import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../core/session.service';
import { ME_FIXTURE, loadSession, testProviders } from '../testing/me.fixture';
import { Dashboard } from './dashboard';

async function mount() {
  await TestBed.configureTestingModule({
    imports: [Dashboard],
    providers: testProviders(true),
  }).compileComponents();
  const fixture = TestBed.createComponent(Dashboard);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Dashboard', () => {
  it('shows a loading state until the session is ready', async () => {
    const { el } = await mount();
    expect(el.querySelector('[aria-busy="true"]')?.textContent).toContain(
      'Loading',
    );
  });

  it('renders stats and each brand preview in its own theme', async () => {
    const { fixture, el } = await mount();
    await loadSession();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('2 brands');
    const themed = el.querySelectorAll<HTMLElement>('article[data-theme]');
    expect(themed).toHaveLength(1);
    expect(themed[0].dataset['theme']).toBe('demo-brand');
    expect(themed[0].style.getPropertyValue('--brand-primary')).toBe('#2563EB');
    expect(themed[0].textContent).toContain('Brand One');
    expect(el.textContent).toContain('No theme yet');
  });

  it('shows the error state and retries', async () => {
    const { fixture, el } = await mount();
    await loadSession(null);
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load your studio",
    );

    el.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/me')
      .flush(ME_FIXTURE);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(SessionService).status()).toBe('ready');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('explains when the user belongs to no studio', async () => {
    const { fixture, el } = await mount();
    await loadSession({ user: ME_FIXTURE.user, memberships: [] });
    fixture.detectChanges();
    expect(el.textContent).toContain('not a member of a studio yet');
    expect(el.textContent).toContain('owner@example.com');
  });
});
