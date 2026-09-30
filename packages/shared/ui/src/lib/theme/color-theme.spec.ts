import { TestBed } from '@angular/core/testing';
import { COLOR_ROLES } from './color-theme.model';
import {
  ColorThemeService,
  applyColorTheme,
  colorThemeToCssVariables,
  provideColorTheme,
} from './color-theme.service';
import { PRINCESS_PRODUCTIONS_THEME } from './princess-productions.theme';

describe('ColorTheme', () => {
  it('defines every role in the Princess Productions theme', () => {
    for (const role of COLOR_ROLES) {
      const color = PRINCESS_PRODUCTIONS_THEME.colors[role];
      expect(color.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color.name).not.toBe('');
    }
  });

  it('flattens a theme into --brand-* variables', () => {
    expect(colorThemeToCssVariables(PRINCESS_PRODUCTIONS_THEME)).toEqual({
      '--brand-primary': '#EE2762',
      '--brand-ink': '#181518',
      '--brand-paper': '#F5E7D5',
      '--brand-secondary': '#861D3B',
      '--brand-tint': '#F4B5C5',
    });
  });

  it('writes variables and a data-theme marker onto the root element', () => {
    const root = document.createElement('div');
    applyColorTheme(PRINCESS_PRODUCTIONS_THEME, root);
    expect(root.style.getPropertyValue('--brand-primary')).toBe('#EE2762');
    expect(root.dataset['theme']).toBe('princess-productions');
  });

  it('applies the provided theme at bootstrap', () => {
    TestBed.configureTestingModule({
      providers: [provideColorTheme(PRINCESS_PRODUCTIONS_THEME)],
    });
    const service = TestBed.inject(ColorThemeService);
    expect(service.theme()?.id).toBe('princess-productions');
    expect(
      document.documentElement.style.getPropertyValue('--brand-secondary'),
    ).toBe('#861D3B');
  });
});
