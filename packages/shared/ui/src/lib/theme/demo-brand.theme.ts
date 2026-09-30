import { ColorTheme } from './color-theme.model';

/**
 * A neutral example brand theme used by the seed, tests and previews.
 * Real brand themes live in the database and are edited in the CMS.
 */
export const DEMO_BRAND_THEME: ColorTheme = {
  id: 'demo-brand',
  name: 'Demo Brand',
  colors: {
    primary: {
      name: 'Signal Blue',
      description: 'Bright cobalt',
      hex: '#2563EB',
      purpose: 'Primary brand colour',
    },
    ink: {
      name: 'Graphite',
      description: 'Near-black slate',
      hex: '#0F172A',
      purpose: 'Backgrounds in dark mode, typography',
    },
    paper: {
      name: 'Linen',
      description: 'Cool off-white',
      hex: '#F8FAFC',
      purpose: 'Page background in light mode',
    },
    secondary: {
      name: 'Violet',
      description: 'Deep violet',
      hex: '#7C3AED',
      purpose: 'Secondary accent',
    },
    tint: {
      name: 'Mist',
      description: 'Pale blue-grey',
      hex: '#CBD5E1',
      purpose: 'Muted text, borders, secondary graphics',
    },
  },
};
