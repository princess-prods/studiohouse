import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MeResponse } from '@studiohouse/models';
import { DEMO_BRAND_THEME } from '@studiohouse/ui';
import { SessionService } from './session.service';

const ME: MeResponse = {
  user: { id: 'u1', email: 'o@x.test', name: 'Owner' },
  memberships: [
    {
      studio: { id: 's1', slug: 'alpha', name: 'Alpha Studio' },
      role: 'owner',
      brands: [
        { id: 'b1', slug: 'one', name: 'One', theme: DEMO_BRAND_THEME },
        { id: 'b2', slug: 'two', name: 'Two', theme: null },
      ],
    },
    {
      studio: { id: 's2', slug: 'beta', name: 'Beta Studio' },
      role: 'editor',
      brands: [],
    },
  ],
};

function setup() {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    session: TestBed.inject(SessionService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('SessionService', () => {
  it('loads /me and selects the first membership by default', async () => {
    const { session, http } = setup();
    expect(session.status()).toBe('idle');
    const loading = session.load();
    expect(session.status()).toBe('loading');
    http.expectOne('/api/me').flush(ME);
    await loading;
    expect(session.status()).toBe('ready');
    expect(session.studio()?.name).toBe('Alpha Studio');
    expect(session.role()).toBe('owner');
    expect(session.brands().map((b) => b.slug)).toEqual(['one', 'two']);
    expect(session.canSwitchStudio()).toBe(true);
  });

  it('shares one request between concurrent callers and skips when ready', async () => {
    const { session, http } = setup();
    const both = Promise.all([session.load(), session.load()]);
    http.expectOne('/api/me').flush(ME);
    await both;
    await session.load();
    http.expectNone('/api/me');
  });

  it('switches studio, persists the choice, and ignores unknown ids', async () => {
    const { session, http } = setup();
    const loading = session.load();
    http.expectOne('/api/me').flush(ME);
    await loading;
    session.selectStudio('s2');
    expect(session.studio()?.slug).toBe('beta');
    expect(localStorage.getItem('studiohouse.activeStudio')).toBe('s2');
    session.selectStudio('nope');
    expect(session.studio()?.slug).toBe('beta');
  });

  it('restores a remembered studio on the next load', async () => {
    localStorage.setItem('studiohouse.activeStudio', 's2');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const session = TestBed.inject(SessionService);
    const loading = session.load();
    TestBed.inject(HttpTestingController).expectOne('/api/me').flush(ME);
    await loading;
    expect(session.studio()?.slug).toBe('beta');
  });

  it('records an error and can refresh afterwards', async () => {
    const { session, http } = setup();
    const first = session.load();
    http
      .expectOne('/api/me')
      .flush({ error: 'nope' }, { status: 500, statusText: 'Server Error' });
    await first;
    expect(session.status()).toBe('error');
    expect(session.error()).toContain('500');
    expect(session.membership()).toBeNull();

    const second = session.refresh();
    http.expectOne('/api/me').flush(ME);
    await second;
    expect(session.status()).toBe('ready');
  });

  it('clears everything on sign-out', async () => {
    const { session, http } = setup();
    const loading = session.load();
    http.expectOne('/api/me').flush(ME);
    await loading;
    session.clear();
    expect(session.status()).toBe('idle');
    expect(session.user()).toBeNull();
    expect(session.brands()).toEqual([]);
  });

  it('keeps working when browser storage is unavailable', async () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    try {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      const session = TestBed.inject(SessionService);
      const loading = session.load();
      TestBed.inject(HttpTestingController).expectOne('/api/me').flush(ME);
      await loading;
      expect(() => session.selectStudio('s2')).not.toThrow();
      expect(session.studio()?.slug).toBe('beta');
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});
