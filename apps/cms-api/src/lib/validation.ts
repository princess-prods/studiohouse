import { COLOR_ROLES, HexColor } from '@studiohouse/models';
import { z } from 'zod';

export class ValidationError extends Error {
  readonly status = 400;
  constructor(
    message: string,
    readonly issues: readonly { path: string; message: string }[],
  ) {
    super(message);
  }
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(SLUG, 'lowercase letters, digits and hyphens');
const name = z.string().trim().min(1).max(120);
const hex = z
  .string()
  .regex(HEX, 'must be #RRGGBB')
  .transform((v) => v.toUpperCase() as HexColor);
const domains = z
  .array(z.string().trim().toLowerCase().regex(HOSTNAME, 'must be a hostname'))
  .max(20);

const themeColor = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).default(''),
  hex,
  purpose: z.string().trim().max(200).default(''),
});

const colors = z.object(
  Object.fromEntries(COLOR_ROLES.map((role) => [role, themeColor])) as Record<
    (typeof COLOR_ROLES)[number],
    typeof themeColor
  >,
);

export const createBrandSchema = z.object({
  name,
  slug: slug.optional(),
  domains: domains.optional(),
  themeId: z.uuid().nullable().optional(),
});

export const updateBrandSchema = createBrandSchema
  .partial()
  .extend({
    features: z.record(z.string().min(1).max(60), z.boolean()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing to update');

export const createThemeSchema = z.object({
  name,
  slug: slug.optional(),
  colors,
});

export const updateThemeSchema = createThemeSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'nothing to update');

/** Parses `input` or throws a 400 with field-level issues. */
export function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ValidationError(
    'Invalid request',
    result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  );
}

/** "Brand One!" -> "brand-one" */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
