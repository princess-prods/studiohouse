import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  brands,
  colorRole,
  colorThemes,
  memberships,
  studios,
  themeColors,
  users,
} from './schema';

describe('schema', () => {
  it('scopes every tenant table to a studio', () => {
    for (const table of [brands, colorThemes, memberships]) {
      const { foreignKeys } = getTableConfig(table);
      const toStudio = foreignKeys.some(
        (fk) => getTableConfig(fk.reference().foreignTable).name === 'studios',
      );
      expect(toStudio).toBe(true);
    }
  });

  it('keeps colour roles in sync with the ui ColorRole union', () => {
    // Mirror of COLOR_ROLES in @studiohouse/ui. Update both when adding a role.
    expect(colorRole.enumValues).toEqual([
      'primary',
      'ink',
      'paper',
      'secondary',
      'tint',
    ]);
  });

  it('allows exactly one colour per role per theme', () => {
    const { primaryKeys } = getTableConfig(themeColors);
    expect(primaryKeys[0].columns.map((c) => c.name)).toEqual([
      'theme_id',
      'role',
    ]);
  });

  it('identifies users by the auth provider id', () => {
    const { columns } = getTableConfig(users);
    const id = columns.find((c) => c.name === 'id');
    expect(id?.primary).toBe(true);
    expect(id?.dataType).toBe('string');
  });

  it('names tables as documented', () => {
    expect(getTableConfig(studios).name).toBe('studios');
    expect(getTableConfig(brands).name).toBe('brands');
  });
});
