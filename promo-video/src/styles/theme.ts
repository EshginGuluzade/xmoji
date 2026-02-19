export const COLORS = {
  background: '#000000',
  textPrimary: '#e7e9ea',
  textSecondary: '#71767b',
  accentBlue: '#1d9bf0',
  border: '#2f3336',
  emojiYellow: '#F4A828',
  dimBlue: '#15202b',
} as const;

export const THEME_COLORS = {
  light: {
    bg: '#ffffff',
    text: '#0f1419',
    textSecondary: '#536471',
    border: '#eff3f4',
    hoverBg: 'rgba(0, 0, 0, 0.03)',
    selectedBg: 'rgba(0, 0, 0, 0.06)',
    shadow: '0 0 15px rgba(101, 119, 134, 0.2), 0 0 5px 1px rgba(101, 119, 134, 0.15)',
  },
  dark: {
    bg: '#000000',
    text: '#e7e9ea',
    textSecondary: '#71767b',
    border: '#2f3336',
    hoverBg: 'rgba(231, 233, 234, 0.1)',
    selectedBg: 'rgba(231, 233, 234, 0.15)',
    shadow: '0 0 15px rgba(255, 255, 255, 0.2), 0 0 5px 1px rgba(255, 255, 255, 0.15)',
  },
  dim: {
    bg: '#15202b',
    text: '#d9d9d9',
    textSecondary: '#8b98a5',
    border: '#38444d',
    hoverBg: 'rgba(255, 255, 255, 0.06)',
    selectedBg: 'rgba(255, 255, 255, 0.1)',
    shadow: '0 0 15px rgba(255, 255, 255, 0.2), 0 0 5px 1px rgba(255, 255, 255, 0.15)',
  },
} as const;

export type ThemeName = keyof typeof THEME_COLORS;

export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const SPRING_CONFIG = {
  damping: 12,
  stiffness: 170,
  mass: 1,
} as const;

export const SPRING_BOUNCE = {
  damping: 8,
  stiffness: 200,
  mass: 0.8,
} as const;

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;
export const TOTAL_FRAMES = 1200;
