/**
 * Seeds the Princess Productions studio, its house theme and its brands.
 * Idempotent: re-running updates names and colours but never duplicates rows.
 *
 *   npx nx run db:seed          (reads DATABASE_URL from .env.local)
 */
import { eq } from 'drizzle-orm';
import { createDb } from './lib/client';
import { brands, colorThemes, studios, themeColors } from './lib/schema';

// Mirrors PRINCESS_PRODUCTIONS_THEME in @studiohouse/ui.
const HOUSE_PALETTE = [
  {
    role: 'primary',
    name: 'Princess Pink',
    description: 'Vivid hot pink',
    hex: '#EE2762',
    purpose: 'Primary brand color',
  },
  {
    role: 'ink',
    name: 'After Dark',
    description: 'Near-black charcoal',
    hex: '#181518',
    purpose: 'Backgrounds, typography',
  },
  {
    role: 'paper',
    name: 'Champagne',
    description: 'Warm cream',
    hex: '#F5E7D5',
    purpose: 'Softer alternative to stark white',
  },
  {
    role: 'secondary',
    name: 'Boudoir Red',
    description: 'Deep wine/red',
    hex: '#861D3B',
    purpose: 'Secondary accent',
  },
  {
    role: 'tint',
    name: 'Blush',
    description: 'Pale dusty pink',
    hex: '#F4B5C5',
    purpose: 'Backgrounds and secondary graphics',
  },
] as const;

async function main() {
  const db = createDb();

  const [studio] = await db
    .insert(studios)
    .values({ slug: 'princess-productions', name: 'Princess Productions' })
    .onConflictDoUpdate({
      target: studios.slug,
      set: { name: 'Princess Productions' },
    })
    .returning();

  const [theme] = await db
    .insert(colorThemes)
    .values({
      studioId: studio.id,
      slug: 'princess-productions',
      name: 'Princess Productions',
    })
    .onConflictDoUpdate({
      target: [colorThemes.studioId, colorThemes.slug],
      set: { name: 'Princess Productions' },
    })
    .returning();

  for (const color of HOUSE_PALETTE) {
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

  const brandRows = [
    {
      slug: 'princess-productions',
      name: 'Princess Productions',
      domains: ['princessproductions.com'],
    },
    { slug: 'devinella', name: 'Devinella', domains: ['devinella.com'] },
  ];
  for (const brand of brandRows) {
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
