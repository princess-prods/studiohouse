import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
    }).compileComponents();
  });

  it('renders every brand preview in that brand’s own theme', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const previews = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        'article[data-theme]',
      ),
    );
    expect(previews.length).toBe(2);
    for (const preview of previews) {
      expect(preview.dataset['theme']).toBe('princess-productions');
      expect(preview.style.getPropertyValue('--brand-primary')).toBe('#EE2762');
    }
  });
});
