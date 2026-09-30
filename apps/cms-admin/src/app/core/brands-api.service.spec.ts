import { HttpClient, provideHttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEMO_BRAND_THEME } from '@studiohouse/ui';
import { ApiError, BrandsApi } from './brands-api.service';

const BRAND = {
  id: 'b1',
  slug: 'one',
  name: 'One',
  domains: [],
  features: {},
  themeId: null,
  theme: null,
};
const THEME = {
  id: 't1',
  slug: 'demo',
  name: 'Demo',
  colors: DEMO_BRAND_THEME.colors,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    api: TestBed.inject(BrandsApi),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('BrandsApi', () => {
  it('maps every brand call to the studio-scoped route', async () => {
    const { api, http } = setup();
    const calls: [Promise<unknown>, string, string][] = [
      [api.listBrands('s1'), 'GET', '/api/studios/s1/brands'],
      [api.getBrand('s1', 'b1'), 'GET', '/api/studios/s1/brands/b1'],
      [
        api.createBrand('s1', { name: 'One' }),
        'POST',
        '/api/studios/s1/brands',
      ],
      [
        api.updateBrand('s1', 'b1', { name: 'Uno' }),
        'PATCH',
        '/api/studios/s1/brands/b1',
      ],
      [api.deleteBrand('s1', 'b1'), 'DELETE', '/api/studios/s1/brands/b1'],
    ];
    for (const [pending, method, url] of calls) {
      const req = http.expectOne({ method, url });
      req.flush(
        method === 'DELETE'
          ? null
          : method === 'GET' && url.endsWith('brands')
            ? [BRAND]
            : BRAND,
      );
      await pending;
    }
    http.verify();
  });

  it('maps every theme call to the studio-scoped route and sends the body', async () => {
    const { api, http } = setup();
    const created = api.createTheme('s1', {
      name: 'Demo',
      colors: DEMO_BRAND_THEME.colors,
    });
    const post = http.expectOne({
      method: 'POST',
      url: '/api/studios/s1/themes',
    });
    expect(post.request.body).toEqual({
      name: 'Demo',
      colors: DEMO_BRAND_THEME.colors,
    });
    post.flush(THEME);
    expect((await created).id).toBe('t1');

    const list = api.listThemes('s1');
    http
      .expectOne({ method: 'GET', url: '/api/studios/s1/themes' })
      .flush([THEME]);
    expect(await list).toHaveLength(1);

    const updated = api.updateTheme('s1', 't1', { name: 'Renamed' });
    http
      .expectOne({ method: 'PUT', url: '/api/studios/s1/themes/t1' })
      .flush({ ...THEME, name: 'Renamed' });
    expect((await updated).name).toBe('Renamed');

    const deleted = api.deleteTheme('s1', 't1');
    http
      .expectOne({ method: 'DELETE', url: '/api/studios/s1/themes/t1' })
      .flush(null);
    await deleted;
    http.verify();
  });

  it('turns HTTP failures into ApiError with status, message and issues', async () => {
    const { api, http } = setup();
    const pending = api.createBrand('s1', { name: '' });
    http.expectOne('/api/studios/s1/brands').flush(
      {
        error: 'Invalid request',
        issues: [{ path: 'name', message: 'too small' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await expect(pending).rejects.toMatchObject({
      status: 400,
      message: 'Invalid request',
      issues: [{ path: 'name', message: 'too small' }],
    });
    await expect(pending).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to the transport message when the body has none', async () => {
    const { api, http } = setup();
    const pending = api.listBrands('s1');
    http
      .expectOne('/api/studios/s1/brands')
      .flush(null, { status: 502, statusText: 'Bad Gateway' });
    const error = (await pending.catch((e) => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.message).toContain('502');
    expect(error.issues).toEqual([]);
  });

  it('reports network failures as ApiError with status 0', async () => {
    const { api, http } = setup();
    const pending = api.listBrands('s1');
    http.expectOne('/api/studios/s1/brands').error(new ProgressEvent('error'));
    await expect(pending).rejects.toMatchObject({ status: 0 });
  });

  it('rethrows non-HTTP errors untouched', async () => {
    const { api } = setup();
    const boom = new Error('boom');
    vi.spyOn(TestBed.inject(HttpClient), 'get').mockReturnValue(
      throwError(() => boom),
    );
    await expect(api.listBrands('s1')).rejects.toBe(boom);
  });
});
