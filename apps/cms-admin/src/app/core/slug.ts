/** "Brand One!" -> "brand-one". Mirrors the API's slugify. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export const SLUG_PATTERN = '^[a-z0-9]+(?:-[a-z0-9]+)*$';
