// theme.js — X theme detection

export function detectXTheme() {
  const bg = window.getComputedStyle(document.body).backgroundColor;

  if (bg === 'rgb(255, 255, 255)') return 'light';
  if (bg === 'rgb(0, 0, 0)') return 'dark';
  if (bg === 'rgb(21, 32, 43)') return 'dim';

  // Luminance-based fallback
  const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    const luminance = (0.299 * +match[1] + 0.587 * +match[2] + 0.114 * +match[3]) / 255;
    return luminance > 0.5 ? 'light' : 'dark';
  }
  return 'light';
}

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
};

export function applyThemeToPopup(popupEl) {
  if (!popupEl) return;
  const theme = detectXTheme();
  const colors = THEME_COLORS[theme] || THEME_COLORS.light;

  popupEl.style.backgroundColor = colors.bg;
  popupEl.style.color = colors.text;
  popupEl.style.border = `1px solid ${colors.border}`;
  popupEl.style.boxShadow = colors.shadow;

  // Store for item hover/selection styles
  popupEl.dataset.themeBg = colors.selectedBg;
  popupEl.dataset.themeHoverBg = colors.hoverBg;
  popupEl.dataset.themeTextSecondary = colors.textSecondary;

  // Apply to existing items
  popupEl.querySelectorAll('.emoji-ac-item.selected').forEach(el => {
    el.style.backgroundColor = colors.selectedBg;
  });
  popupEl.querySelectorAll('.emoji-ac-name').forEach(el => {
    el.style.color = colors.textSecondary;
  });
}

export function watchThemeChanges(callback) {
  const observer = new MutationObserver(() => callback(detectXTheme()));
  observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
  return observer;
}
