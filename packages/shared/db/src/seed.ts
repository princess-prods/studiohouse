/**
 * Seeds a demo studio with a theme and two brands so a fresh branch has
 * something to show. Idempotent: re-running updates names and colours but
 * never duplicates rows. Real studios are created through the CMS.
 *
 *   npx nx run db:seed          (reads DATABASE_URL from .env.local)
 */
import { eq } from 'drizzle-orm';
import { createDb } from './lib/client';
import { brands, colorThemes, studios, themeColors } from './lib/schema';

const STUDIO = { slug: 'demo-studio', name: 'Demo Studio' };

// Mirrors DEMO_BRAND_THEME in @studiohouse/ui.
const DEMO_PALETTE = [
  {
    role: 'primary',
    name: 'Signal Blue',
    description: 'Bright cobalt',
    hex: '#2563EB',
    purpose: 'Primary brand colour',
  },
  {
    role: 'ink',
    name: 'Graphite',
    description: 'Near-black slate',
    hex: '#0F172A',
    purpose: 'Backgrounds in dark mode, typography',
  },
  {
    role: 'paper',
    name: 'Linen',
    description: 'Cool off-white',
    hex: '#F8FAFC',
    purpose: 'Page background in light mode',
  },
  {
    role: 'secondary',
    name: 'Violet',
    description: 'Deep violet',
    hex: '#7C3AED',
    purpose: 'Secondary accent',
  },
  {
    role: 'tint',
    name: 'Mist',
    description: 'Pale blue-grey',
    hex: '#CBD5E1',
    purpose: 'Muted text, borders, secondary graphics',
  },
] as const;

const BRANDS = [
  { slug: 'brand-one', name: 'Brand One', domains: ['brand-one.example'] },
  { slug: 'brand-two', name: 'Brand Two', domains: ['brand-two.example'] },
];

async function main() {
  const db = createDb();

  const [studio] = await db
    .insert(studios)
    .values(STUDIO)
    .onConflictDoUpdate({ target: studios.slug, set: { name: STUDIO.name } })
    .returning();

  const [theme] = await db
    .insert(colorThemes)
    .values({ studioId: studio.id, slug: 'demo-brand', name: 'Demo Brand' })
    .onConflictDoUpdate({
      target: [colorThemes.studioId, colorThemes.slug],
      set: { name: 'Demo Brand' },
    })
    .returning();

  for (const color of DEMO_PALETTE) {
    await db
      .insert(themeColors)
      .values({ themeId: theme.id, ...color })
      .onConflictDoUpdate({
        target: [themeColors.themeId, themeColors.role],
        set: {
          name: color.name,
          description: color.description,
          hex: color.hex,
          purpose: color.purpose,
        },
      });
  }

  for (const brand of BRANDS) {
    await db
      .insert(brands)
      .values({ studioId: studio.id, themeId: theme.id, ...brand })
      .onConflictDoUpdate({
        target: [brands.studioId, brands.slug],
        set: { name: brand.name, domains: brand.domains },
      });
  }

  const seeded = await db
    .select({ slug: brands.slug })
    .from(brands)
    .where(eq(brands.studioId, studio.id));
  console.log(
    `Seeded studio "${studio.name}" with brands: ${seeded.map((b) => b.slug).join(', ')}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
