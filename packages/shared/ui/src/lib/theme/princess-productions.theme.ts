import { ColorTheme } from './color-theme.model';

/**
 * The house theme for Princess Productions. Other outlets define their own
 * `ColorTheme` with the same five roles.
 */
export const PRINCESS_PRODUCTIONS_THEME: ColorTheme = {
  id: 'princess-productions',
  name: 'Princess Productions',
  colors: {
    primary: {
      name: 'Princess Pink',
      description: 'Vivid hot pink',
      hex: '#EE2762',
      purpose: 'Primary brand color',
    },
    ink: {
      name: 'After Dark',
      description: 'Near-black charcoal',
      hex: '#181518',
      purpose: 'Backgrounds, typography',
    },
    paper: {
      name: 'Champagne',
      description: 'Warm cream',
      hex: '#F5E7D5',
      purpose: 'Softer alternative to stark white',
    },
    secondary: {
      name: 'Boudoir Red',
      description: 'Deep wine/red',
      hex: '#861D3B',
      purpose: 'Secondary accent',
    },
    tint: {
      name: 'Blush',
      description: 'Pale dusty pink',
      hex: '#F4B5C5',
      purpose: 'Backgrounds and secondary graphics',
    },
  },
};
