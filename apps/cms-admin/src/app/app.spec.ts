import { TestBed } from '@angular/core/testing';
import { PRINCESS_PRODUCTIONS_THEME, provideColorTheme } from '@studiohouse/ui';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideColorTheme(PRINCESS_PRODUCTIONS_THEME)],
    }).compileComponents();
  });

  it('renders the title and active theme', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Studiohouse');
    expect(compiled.textContent).toContain('Princess Pink');
  });
});
