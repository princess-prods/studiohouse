import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { STUDIOHOUSE_THEME, provideColorTheme } from '@studiohouse/ui';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideColorTheme(STUDIOHOUSE_THEME)],
    }).compileComponents();
  });

  it('renders the Studiohouse shell with primary navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside')?.textContent).toContain('house');
    const labels = Array.from(compiled.querySelectorAll('nav li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Brands');
  });

  it('wears the product theme, not a brand theme', () => {
    TestBed.createComponent(App);
    expect(document.documentElement.dataset['theme']).toBe('studiohouse');
  });
});
