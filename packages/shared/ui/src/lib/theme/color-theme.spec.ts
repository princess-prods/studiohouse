import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { COLOR_ROLES, STATUS_ROLES } from './color-theme.model';
import {
  BrandThemeDirective,
  ColorThemeService,
  applyColorTheme,
  colorThemeToCssVariables,
  provideColorTheme,
} from './color-theme.service';
import { PRINCESS_PRODUCTIONS_THEME } from './princess-productions.theme';
import { STUDIOHOUSE_THEME } from './studiohouse.theme';

describe('ColorTheme', () => {
  it('defines every core role in both built-in themes', () => {
    for (const theme of [PRINCESS_PRODUCTIONS_THEME, STUDIOHOUSE_THEME]) {
      for (const role of COLOR_ROLES) {
        expect(theme.colors[role].hex).toMatch(/^#[0-9A-F]{6}$/i);
        expect(theme.colors[role].name).not.toBe('');
      }
    }
  });

  it('gives the product theme every status colour and both fonts', () => {
    for (const role of STATUS_ROLES) {
      expect(STUDIOHOUSE_THEME.status?.[role]?.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(STUDIOHOUSE_THEME.fonts?.display).toContain('Playfair Display');
    expect(STUDIOHOUSE_THEME.fonts?.body).toContain('Inter');
  });

  it('flattens core roles only when optional slots are absent', () => {
    expect(colorThemeToCssVariables(PRINCESS_PRODUCTIONS_THEME)).toEqual({
      '--brand-primary': '#EE2762',
      '--brand-ink': '#181518',
      '--brand-paper': '#F5E7D5',
      '--brand-secondary': '#861D3B',
      '--brand-tint': '#F4B5C5',
    });
  });

  it('flattens status colours and fonts when present', () => {
    const vars = colorThemeToCssVariables(STUDIOHOUSE_THEME);
    expect(vars['--brand-success']).toBe('#A7B8A1');
    expect(vars['--brand-info']).toBe('#E8EDF0');
    expect(vars['--font-display']).toContain('Playfair Display');
  });

  it('clears optional variables when switching to a theme without them', () => {
    const root = document.createElement('div');
    applyColorTheme(STUDIOHOUSE_THEME, root);
    expect(root.style.getPropertyValue('--brand-success')).toBe('#A7B8A1');
    applyColorTheme(PRINCESS_PRODUCTIONS_THEME, root);
    expect(root.style.getPropertyValue('--brand-success')).toBe('');
    expect(root.style.getPropertyValue('--font-display')).toBe('');
    expect(root.dataset['theme']).toBe('princess-productions');
  });

  it('applies the provided theme at bootstrap', () => {
    TestBed.configureTestingModule({
      providers: [provideColorTheme(STUDIOHOUSE_THEME)],
    });
    const service = TestBed.inject(ColorThemeService);
    expect(service.theme()?.id).toBe('studiohouse');
    expect(
      document.documentElement.style.getPropertyValue('--brand-primary'),
    ).toBe('#D4A574');
  });

  it('scopes a brand theme to a subtree with the directive', async () => {
    @Component({
      imports: [BrandThemeDirective],
      template: `<section [shBrandTheme]="theme"></section>`,
    })
    class Host {
      theme = PRINCESS_PRODUCTIONS_THEME;
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    expect(section.style.getPropertyValue('--brand-primary')).toBe('#EE2762');
    expect(section.dataset['theme']).toBe('princess-productions');
  });
});
