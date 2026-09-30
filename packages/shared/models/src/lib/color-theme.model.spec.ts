import { COLOR_ROLES, STATUS_ROLES } from './color-theme.model';

describe('theme role constants', () => {
  it('lists the five core roles in stylesheet order', () => {
    expect(COLOR_ROLES).toEqual([
      'primary',
      'ink',
      'paper',
      'secondary',
      'tint',
    ]);
  });

  it('lists the four status roles', () => {
    expect(STATUS_ROLES).toEqual(['success', 'warning', 'danger', 'info']);
  });

  it('does not overlap core and status roles', () => {
    const all = new Set<string>([...COLOR_ROLES, ...STATUS_ROLES]);
    expect(all.size).toBe(COLOR_ROLES.length + STATUS_ROLES.length);
  });
});
