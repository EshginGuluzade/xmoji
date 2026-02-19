import React from 'react';
import { THEME_COLORS, FONT_FAMILY, ThemeName } from '../styles/theme';

export interface AutocompleteItem {
  emoji: string;
  name: string;
}

export const MockAutocomplete: React.FC<{
  items: AutocompleteItem[];
  selectedIndex: number;
  theme?: ThemeName;
  width?: number;
}> = ({ items, selectedIndex, theme = 'dark', width = 280 }) => {
  const colors = THEME_COLORS[theme];

  return (
    <div
      style={{
        width,
        borderRadius: 12,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: colors.shadow,
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
        fontSize: 15,
        lineHeight: '20px',
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            backgroundColor:
              i === selectedIndex ? colors.selectedBg : 'transparent',
            transition: 'background-color 0.1s',
          }}
        >
          <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>
            {item.emoji}
          </span>
          <span
            style={{
              color: colors.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            :{item.name}:
          </span>
        </div>
      ))}
    </div>
  );
};
