import {
  BRAND_DELETE_ROLE,
  BRAND_WRITE_ROLE,
  ROLE_RANK,
  roleAtLeast,
  toColorTheme,
} from './brands.model';

describe('roleAtLeast', () => {
  it('orders roles viewer < editor < admin < owner', () => {
    expect(ROLE_RANK.viewer).toBeLessThan(ROLE_RANK.editor);
    expect(ROLE_RANK.editor).toBeLessThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeLessThan(ROLE_RANK.owner);
  });

  it('accepts equal or higher roles and rejects lower or missing ones', () => {
    expect(roleAtLeast('owner', BRAND_WRITE_ROLE)).toBe(true);
    expect(roleAtLeast('admin', BRAND_WRITE_ROLE)).toBe(true);
    expect(roleAtLeast('editor', BRAND_WRITE_ROLE)).toBe(false);
    expect(roleAtLeast('admin', BRAND_DELETE_ROLE)).toBe(false);
    expect(roleAtLeast(null, 'viewer')).toBe(false);
    expect(roleAtLeast(undefined, 'viewer')).toBe(false);
  });
});

describe('toColorTheme', () => {
  it('uses the slug as the theme id and drops the database id', () => {
    const colors = {
      primary: { name: 'a', description: '', hex: '#111111', purpose: '' },
      ink: { name: 'b', description: '', hex: '#222222', purpose: '' },
      paper: { name: 'c', description: '', hex: '#333333', purpose: '' },
      secondary: { name: 'd', description: '', hex: '#444444', purpose: '' },
      tint: { name: 'e', description: '', hex: '#555555', purpose: '' },
    } as const;
    expect(
      toColorTheme({ id: 'uuid', slug: 'dusk', name: 'Dusk', colors }),
    ).toEqual({ id: 'dusk', name: 'Dusk', colors });
  });
});
