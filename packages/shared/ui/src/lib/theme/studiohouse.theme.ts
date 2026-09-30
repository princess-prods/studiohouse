import { ColorTheme } from './color-theme.model';

/**
 * The Studiohouse product theme, worn by the CMS shell. Brand themes are
 * applied only inside brand-scoped previews and editors.
 */
export const STUDIOHOUSE_THEME: ColorTheme = {
  id: 'studiohouse',
  name: 'Studiohouse',
  colors: {
    primary: {
      name: 'Amber',
      description: 'Warm copper',
      hex: '#D4A574',
      purpose: 'Primary actions, active navigation, the logo mark',
    },
    ink: {
      name: 'Midnight',
      description: 'Deep violet-black',
      hex: '#15131A',
      purpose: 'App background in dark mode, typography in light mode',
    },
    paper: {
      name: 'Champagne',
      description: 'Warm cream',
      hex: '#F1E6DC',
      purpose: 'Typography in dark mode, page background in light mode',
    },
    secondary: {
      name: 'Rosewood',
      description: 'Dusty rose',
      hex: '#B56A6A',
      purpose: 'Secondary accent',
    },
    tint: {
      name: 'Taupe',
      description: 'Muted warm grey',
      hex: '#7A6A61',
      purpose: 'Muted text, borders, inactive icons',
    },
  },
  status: {
    success: {
      name: 'Sage',
      description: 'Soft green',
      hex: '#A7B8A1',
      purpose: 'Success and publish states',
    },
    warning: {
      name: 'Amber',
      description: 'Warm copper',
      hex: '#D4A574',
      purpose: 'Warnings',
    },
    danger: {
      name: 'Rosewood',
      description: 'Dusty rose',
      hex: '#B56A6A',
      purpose: 'Destructive actions and errors',
    },
    info: {
      name: 'Mist',
      description: 'Cool pale grey',
      hex: '#E8EDF0',
      purpose: 'Informational states and subtle highlights',
    },
  },
  fonts: {
    display: '"Playfair Display", Georgia, "Times New Roman", serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

/** Charcoal, the elevated surface colour from the brand board. */
export const STUDIOHOUSE_SURFACE = '#2A2730';
