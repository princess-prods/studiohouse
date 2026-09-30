import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BrandRecord, MeResponse, ThemeRecord } from '@studiohouse/models';
import { DEMO_BRAND_THEME } from '@studiohouse/ui';
import { ME_FIXTURE, loadSession, testProviders } from '../testing/me.fixture';
import { BrandPage } from './brand-page';

const THEME: ThemeRecord = {
  id: 't1',
  slug: 'demo',
  name: 'Demo',
  colors: DEMO_BRAND_THEME.colors,
};
const BRAND: BrandRecord = {
  id: 'b1',
  slug: 'one',
  name: 'One',
  domains: ['one.example'],
  features: {},
  themeId: 't1',
  theme: DEMO_BRAND_THEME,
};

async function mount(me: MeResponse = ME_FIXTURE, brand: BrandRecord = BRAND) {
  await TestBed.configureTestingModule({
    imports: [BrandPage],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      ...testProviders(true),
    ],
  }).compileComponents();
  await loadSession(me);
  const fixture = TestBed.createComponent(BrandPage);
  fixture.componentRef.setInput('brandId', brand.id);
  await fixture.whenStable();
  const http = TestBed.inject(HttpTestingController);
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    // Zoneless: let pending promise chains resolve before checking the DOM.
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  http.expectOne(`/api/studios/s1/brands/${brand.id}`).flush(brand);
  http.expectOne('/api/studios/s1/themes').flush([THEME]);
  await settle();
  const type = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`no #${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const pickTheme = async (value: string) => {
    const select = el.querySelector<HTMLSelectElement>('#edit-theme');
    if (!select) throw new Error('no theme select');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await settle();
  };
  const button = (text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );
  return { fixture, el, http, settle, type, pickTheme, button };
}

function asRole(role: MeResponse['memberships'][number]['role']): MeResponse {
  return {
    ...ME_FIXTURE,
    memberships: [{ ...ME_FIXTURE.memberships[0], role }],
  };
}

describe('BrandPage', () => {
  it('loads the brand into the form and shows its theme editor', async () => {
    const { el } = await mount();
    expect(el.querySelector('h1')?.textContent).toContain('One');
    expect(el.querySelector<HTMLInputElement>('#edit-slug')?.value).toBe('one');
    expect(el.querySelector<HTMLInputElement>('#edit-domains')?.value).toBe(
      'one.example',
    );
    expect(el.querySelector<HTMLSelectElement>('#edit-theme')?.value).toBe(
      't1',
    );
    expect(el.querySelector('cms-theme-editor')).not.toBeNull();
    expect(el.querySelector<HTMLInputElement>('#theme-name')?.value).toBe(
      'Demo',
    );
  });

  it('saves brand details and refreshes the session', async () => {
    const { el, http, type, settle, button } = await mount();
    type('edit-name', 'Uno');
    type('edit-domains', 'uno.example www.uno.example');
    await settle();
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();
    const patch = http.expectOne({
      method: 'PATCH',
      url: '/api/studios/s1/brands/b1',
    });
    expect(patch.request.body).toEqual({
      name: 'Uno',
      slug: 'one',
      domains: ['uno.example', 'www.uno.example'],
      themeId: 't1',
    });
    patch.flush({ ...BRAND, name: 'Uno' });
    await settle();
    http.expectOne('/api/me').flush(ME_FIXTURE);
    await settle();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Saved');
    expect(el.querySelector('h1')?.textContent).toContain('Uno');
    expect(button('Save brand')).toBeDefined();
  });

  it('unassigns the theme and surfaces save errors', async () => {
    const { el, http, pickTheme, settle } = await mount();
    await pickTheme('');
    expect(el.querySelector('cms-theme-editor')).toBeNull();
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();
    const patch = http.expectOne({
      method: 'PATCH',
      url: '/api/studios/s1/brands/b1',
    });
    expect(patch.request.body).toMatchObject({ themeId: null });
    patch.flush(
      { error: 'Requires admin role' },
      { status: 403, statusText: 'Forbidden' },
    );
    await settle();
    expect(el.querySelector('form [role="alert"]')?.textContent).toContain(
      'admin',
    );
  });

  it('creates a new theme from the editor and assigns it to the brand', async () => {
    const { el, http, pickTheme, settle } = await mount({
      ...ME_FIXTURE,
    });
    await pickTheme('__new__');
    expect(el.textContent).toContain('New theme');
    const name = el.querySelector<HTMLInputElement>('#theme-name');
    if (!name) throw new Error('no theme name');
    name.value = 'Dusk';
    name.dispatchEvent(new Event('input'));
    await settle();
    el.querySelector('cms-theme-editor form')?.dispatchEvent(
      new Event('submit'),
    );
    await settle();

    const post = http.expectOne({
      method: 'POST',
      url: '/api/studios/s1/themes',
    });
    expect(post.request.body).toMatchObject({ name: 'Dusk' });
    const created: ThemeRecord = {
      ...THEME,
      id: 't2',
      slug: 'dusk',
      name: 'Dusk',
    };
    post.flush(created);
    await settle();
    const assign = http.expectOne({
      method: 'PATCH',
      url: '/api/studios/s1/brands/b1',
    });
    expect(assign.request.body).toEqual({ themeId: 't2' });
    assign.flush({
      ...BRAND,
      themeId: 't2',
      theme: { ...DEMO_BRAND_THEME, id: 'dusk', name: 'Dusk' },
    });
    await settle();
    http.expectOne('/api/me').flush(ME_FIXTURE);
    await settle();
    expect(el.querySelector<HTMLSelectElement>('#edit-theme')?.value).toBe(
      't2',
    );
    const options = Array.from(el.querySelectorAll('#edit-theme option')).map(
      (o) => o.textContent?.trim(),
    );
    expect(options).toContain('Dusk');
  });

  it('updates the existing theme in place and reloads the brand', async () => {
    const { el, http, settle } = await mount();
    el.querySelector('cms-theme-editor form')?.dispatchEvent(
      new Event('submit'),
    );
    await settle();
    const put = http.expectOne({
      method: 'PUT',
      url: '/api/studios/s1/themes/t1',
    });
    put.flush({ ...THEME, name: 'Demo' });
    await settle();
    http
      .expectOne({ method: 'GET', url: '/api/studios/s1/brands/b1' })
      .flush(BRAND);
    await settle();
    http.expectOne('/api/me').flush(ME_FIXTURE);
    await settle();
    expect(el.querySelector('cms-theme-editor [role="alert"]')).toBeNull();
  });

  it('shows theme save errors from the API', async () => {
    const { el, http, settle } = await mount();
    el.querySelector('cms-theme-editor form')?.dispatchEvent(
      new Event('submit'),
    );
    await settle();
    http.expectOne({ method: 'PUT', url: '/api/studios/s1/themes/t1' }).flush(
      {
        error: 'Invalid request',
        issues: [{ path: 'colors.ink.hex', message: 'must be #RRGGBB' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();
    expect(
      el.querySelector('cms-theme-editor [role="alert"]')?.textContent,
    ).toContain('colors.ink.hex');
  });

  it('is read-only for editors and hides delete from admins', async () => {
    const { el } = await mount(asRole('editor'));
    expect(
      el.querySelector<HTMLFieldSetElement>('form fieldset')?.disabled,
    ).toBe(true);
    expect(el.textContent).not.toContain('Save brand');
    expect(el.textContent).not.toContain('Delete brand');
    const options = Array.from(el.querySelectorAll('#edit-theme option')).map(
      (o) => o.textContent?.trim(),
    );
    expect(options).not.toContain('New theme…');
  });

  it('deletes the brand after confirmation and returns to the list', async () => {
    const { http, settle, button } = await mount(asRole('owner'));
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    button('Delete brand')?.click();
    await settle();
    http.expectNone({ method: 'DELETE', url: '/api/studios/s1/brands/b1' });

    confirm.mockReturnValue(true);
    button('Delete brand')?.click();
    await settle();
    http
      .expectOne({ method: 'DELETE', url: '/api/studios/s1/brands/b1' })
      .flush(null);
    await settle();
    http.expectOne('/api/me').flush(ME_FIXTURE);
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/brands']);
  });

  it('reports delete failures inline', async () => {
    const { el, http, settle, button } = await mount(asRole('owner'));
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    button('Delete brand')?.click();
    await settle();
    http
      .expectOne({ method: 'DELETE', url: '/api/studios/s1/brands/b1' })
      .flush(
        { error: 'Brand not found' },
        { status: 404, statusText: 'Not Found' },
      );
    await settle();
    expect(el.querySelector('form [role="alert"]')?.textContent).toContain(
      'not found',
    );
  });

  it('shows the load error state', async () => {
    await TestBed.configureTestingModule({
      imports: [BrandPage],
      providers: [provideRouter([]), ...testProviders(true)],
    }).compileComponents();
    await loadSession();
    const fixture = TestBed.createComponent(BrandPage);
    fixture.componentRef.setInput('brandId', 'missing');
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/studios/s1/brands/missing')
      .flush(
        { error: 'Brand not found' },
        { status: 404, statusText: 'Not Found' },
      );
    http.expectOne('/api/studios/s1/themes').flush([]);
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')
        ?.textContent,
    ).toContain("Couldn't load this brand");
  });
});
