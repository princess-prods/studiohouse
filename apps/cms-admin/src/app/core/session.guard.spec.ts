import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ME_FIXTURE, testProviders } from '../testing/me.fixture';
import { sessionGuard } from './session.guard';
import { SessionService } from './session.service';

describe('sessionGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders(true) });
  });

  it('loads the session, then allows navigation', async () => {
    const pending = TestBed.runInInjectionContext(() =>
      sessionGuard({} as never, {} as never),
    );
    TestBed.inject(HttpTestingController)
      .expectOne('/api/me')
      .flush(ME_FIXTURE);
    await expect(pending).resolves.toBe(true);
    expect(TestBed.inject(SessionService).studio()?.slug).toBe('demo-studio');
  });

  it('still allows navigation when the session fails to load', async () => {
    const pending = TestBed.runInInjectionContext(() =>
      sessionGuard({} as never, {} as never),
    );
    TestBed.inject(HttpTestingController)
      .expectOne('/api/me')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await expect(pending).resolves.toBe(true);
    expect(TestBed.inject(SessionService).status()).toBe('error');
  });
});
