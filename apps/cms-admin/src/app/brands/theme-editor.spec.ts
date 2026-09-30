import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CreateThemeInput, ThemeRecord } from '@studiohouse/models';
import { DEMO_BRAND_THEME } from '@studiohouse/ui';
import { ThemeEditor } from './theme-editor';

const THEME: ThemeRecord = {
  id: 't1',
  slug: 'dusk',
  name: 'Dusk',
  colors: {
    ...DEMO_BRAND_THEME.colors,
    primary: { name: 'Ember', description: '', hex: '#AA1122', purpose: '' },
  },
};

@Component({
  imports: [ThemeEditor],
  template: `<cms-theme-editor
    [theme]="theme()"
    [canEdit]="canEdit()"
    [busy]="busy()"
    [error]="error()"
    (save)="saved.push($event)"
  />`,
})
class Host {
  theme = signal<ThemeRecord | null>(null);
  canEdit = signal(true);
  busy = signal(false);
  error = signal<string | null>(null);
  saved: CreateThemeInput[] = [];
}

async function mount(theme: ThemeRecord | null = null) {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.theme.set(theme);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const type = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`no #${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const settle = async () => {
    // Zoneless: let pending promise chains resolve before checking the DOM.
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, el, type, settle };
}

describe('ThemeEditor', () => {
  it('starts from the demo palette when there is no theme', async () => {
    const { el } = await mount();
    expect(el.querySelector<HTMLInputElement>('#theme-name')?.value).toBe('');
    expect(el.querySelector<HTMLInputElement>('#hex-primary')?.value).toBe(
      DEMO_BRAND_THEME.colors.primary.hex,
    );
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain(
      'Create theme',
    );
  });

  it('loads an existing theme and previews it', async () => {
    const { el } = await mount(THEME);
    expect(el.querySelector<HTMLInputElement>('#theme-name')?.value).toBe(
      'Dusk',
    );
    const preview = el.querySelector<HTMLElement>(
      '[aria-label="Theme preview"]',
    );
    expect(preview?.style.getPropertyValue('--brand-primary')).toBe('#AA1122');
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain(
      'Save theme',
    );
  });

  it('updates the preview as colours change and emits on save', async () => {
    const { el, host, type, settle } = await mount(THEME);
    type('hex-primary', '#00ff00');
    type('name-primary', 'Lime');
    type('theme-name', 'Dusk 2');
    await settle();
    const preview = el.querySelector<HTMLElement>(
      '[aria-label="Theme preview"]',
    );
    expect(preview?.style.getPropertyValue('--brand-primary')).toBe('#00FF00');

    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();
    expect(host.saved).toHaveLength(1);
    expect(host.saved[0].name).toBe('Dusk 2');
    expect(host.saved[0].colors.primary).toMatchObject({
      name: 'Lime',
      hex: '#00FF00',
    });
    expect(host.saved[0].colors.ink.hex).toBe(DEMO_BRAND_THEME.colors.ink.hex);
  });

  it('disables save while invalid or busy and shows a grey preview for bad hex', async () => {
    const { el, host, type, settle } = await mount(THEME);
    type('hex-primary', 'nope');
    await settle();
    const submit = el.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.disabled).toBe(true);
    const preview = el.querySelector<HTMLElement>(
      '[aria-label="Theme preview"]',
    );
    expect(preview?.style.getPropertyValue('--brand-primary')).toBe('#888888');
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(host.saved).toHaveLength(0);

    type('hex-primary', '#123456');
    host.busy.set(true);
    await settle();
    expect(submit?.disabled).toBe(true);
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(host.saved).toHaveLength(0);
  });

  it('resets edits back to the loaded theme', async () => {
    const { el, type, settle } = await mount(THEME);
    type('theme-name', 'Changed');
    await settle();
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Reset')
      ?.click();
    await settle();
    expect(el.querySelector<HTMLInputElement>('#theme-name')?.value).toBe(
      'Dusk',
    );
  });

  it('hides the actions and shows the error when read-only or failing', async () => {
    const { el, host, settle } = await mount(THEME);
    host.canEdit.set(false);
    host.error.set('Requires admin role');
    await settle();
    expect(el.querySelector('button[type="submit"]')).toBeNull();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('admin');
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(host.saved).toHaveLength(0);
  });
});
