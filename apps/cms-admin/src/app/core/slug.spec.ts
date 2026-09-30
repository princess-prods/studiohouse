import { SLUG_PATTERN, slugify } from './slug';

describe('slugify', () => {
  it('lowercases, strips accents and punctuation, and hyphenates', () => {
    expect(slugify('Brand One!')).toBe('brand-one');
    expect(slugify('  Café  Noir  ')).toBe('cafe-noir');
    expect(slugify('--Already--slug--')).toBe('already-slug');
  });

  it('caps at 64 characters and always matches the API pattern', () => {
    const long = slugify('x'.repeat(100));
    expect(long).toHaveLength(64);
    for (const s of [long, slugify('Brand One!'), slugify('A B C')]) {
      expect(new RegExp(SLUG_PATTERN).test(s)).toBe(true);
    }
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!!')).toBe('');
  });
});
