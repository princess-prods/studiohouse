import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BrandRecord, MeResponse, ThemeRecord } from '@studiohouse/models';
import { DEMO_BRAND_THEME } from '@studiohouse/ui';
import { ME_FIXTURE, loadSession, testProviders } from '../testing/me.fixture';
import { BrandsPage, describe as describeError } from './brands-page';
import { ApiError } from '../core/brands-api.service';

const THEME: ThemeRecord = {
  id: 't1',
  slug: 'demo',
  name: 'Demo',
  colors: DEMO_BRAND_THEME.colors,
};
const BRANDS: BrandRecord[] = [
  {
    id: 'b1',
    slug: 'one',
    name: 'One',
    domains: ['one.example'],
    features: {},
    themeId: 't1',
    theme: DEMO_BRAND_THEME,
  },
  {
    id: 'b2',
    slug: 'two',
    name: 'Two',
    domains: [],
    features: {},
    themeId: null,
    theme: null,
  },
];

async function mount(me: MeResponse = ME_FIXTURE) {
  await TestBed.configureTestingModule({
    imports: [BrandsPage],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      ...testProviders(true),
    ],
  }).compileComponents();
  await loadSession(me);
  const fixture = TestBed.createComponent(BrandsPage);
  await fixture.whenStable();
  const http = TestBed.inject(HttpTestingController);
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    // Zoneless: let pending promise chains resolve before checking the DOM.
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const flushLists = (brands = BRANDS, themes = [THEME]) => {
    http.expectOne('/api/studios/s1/brands').flush(brands);
    http.expectOne('/api/studios/s1/themes').flush(themes);
  };
  return { fixture, el, http, settle, flushLists };
}

function asRole(role: MeResponse['memberships'][number]['role']): MeResponse {
  return {
    ...ME_FIXTURE,
    memberships: [{ ...ME_FIXTURE.memberships[0], role }],
  };
}

describe('BrandsPage', () => {
  it('lists brands with theme previews and shows the new-brand button to admins', async () => {
    const { el, flushLists, settle } = await mount();
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
    flushLists();
    await settle();
    const cards = el.querySelectorAll('section[aria-label="Brands"] a');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('[data-theme="demo-brand"]')).not.toBeNull();
    expect(cards[1].textContent).toContain('No theme');
    expect(cards[0].textContent).toContain('1 domain');
    expect(el.textContent).toContain('New brand');
  });

  it('hides creation from editors and shows the empty state', async () => {
    const { el, flushLists, settle } = await mount(asRole('editor'));
    flushLists([], []);
    await settle();
    expect(el.textContent).not.toContain('New brand');
    expect(el.textContent).toContain('No brands yet');
    expect(el.textContent).not.toContain('Create the first one');
  });

  it('shows the load error', async () => {
    const { el, http, settle } = await mount();
    http
      .expectOne('/api/studios/s1/brands')
      .flush({ error: 'nope' }, { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/studios/s1/themes').flush([]);
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load brands",
    );
  });

  it('creates a brand from the form, derives the slug, and navigates to it', async () => {
    const { el, http, flushLists, settle } = await mount();
    flushLists();
    await settle();
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('New brand'))
      ?.click();
    await settle();
    const type = (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`#${id}`);
      if (!input) throw new Error(`no #${id}`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('brand-name', 'Night Shift');
    await settle();
    expect(el.querySelector<HTMLInputElement>('#brand-slug')?.value).toBe(
      'night-shift',
    );
    type('brand-domains', 'a.example, b.example');
    const select = el.querySelector<HTMLSelectElement>('#brand-theme');
    if (select) {
      select.value = 't1';
      select.dispatchEvent(new Event('change'));
    }
    await settle();
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();

    const post = http.expectOne({
      method: 'POST',
      url: '/api/studios/s1/brands',
    });
    expect(post.request.body).toEqual({
      name: 'Night Shift',
      slug: 'night-shift',
      domains: ['a.example', 'b.example'],
      themeId: 't1',
    });
    post.flush({
      ...BRANDS[0],
      id: 'b9',
      slug: 'night-shift',
      name: 'Night Shift',
    });
    await settle();
    http.expectOne('/api/me').flush(ME_FIXTURE);
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/brands', 'b9']);
  });

  it('keeps a hand-edited slug and shows API errors inline', async () => {
    const { el, http, flushLists, settle } = await mount();
    flushLists();
    await settle();
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('New brand'))
      ?.click();
    await settle();
    const type = (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`#${id}`);
      if (!input) throw new Error(`no #${id}`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('brand-slug', 'custom');
    type('brand-name', 'Something Else');
    await settle();
    expect(el.querySelector<HTMLInputElement>('#brand-slug')?.value).toBe(
      'custom',
    );

    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();
    http
      .expectOne({ method: 'POST', url: '/api/studios/s1/brands' })
      .flush(
        { error: 'A brand with slug "custom" already exists' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();
    expect(el.querySelector('form [role="alert"]')?.textContent).toContain(
      'already exists',
    );

    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Cancel')
      ?.click();
    await settle();
    expect(el.querySelector('form')).toBeNull();
  });
});

describe('describe()', () => {
  it('formats API issues, plain errors and unknown values', () => {
    expect(
      describeError(
        new ApiError(400, 'Invalid request', [
          { path: 'name', message: 'required' },
        ]),
      ),
    ).toBe('Invalid request (name: required)');
    expect(describeError(new ApiError(409, 'Conflict'))).toBe('Conflict');
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('???')).toBe('Something went wrong.');
  });
});
