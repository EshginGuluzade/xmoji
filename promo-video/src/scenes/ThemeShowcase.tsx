import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { COLORS, FONT_FAMILY, THEME_COLORS, ThemeName, VIDEO_WIDTH, VIDEO_HEIGHT } from '../styles/theme';
import { MockAutocomplete, AutocompleteItem } from '../components/MockAutocomplete';

const DEMO_ITEMS: AutocompleteItem[] = [
  { emoji: '🚀', name: 'rocket' },
  { emoji: '🎉', name: 'tada' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '🔥', name: 'fire' },
];

const THEMES: { name: string; key: ThemeName; bgColor: string }[] = [
  { name: 'Light', key: 'light', bgColor: '#ffffff' },
  { name: 'Dim', key: 'dim', bgColor: '#15202b' },
  { name: 'Dark', key: 'dark', bgColor: '#000000' },
];

export const ThemeShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fade in
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        gap: 40,
      }}
    >
      {/* Scene title */}
      <div
        style={{
          fontSize: 28,
          color: COLORS.textSecondary,
          fontWeight: 500,
          opacity: titleOpacity,
        }}
      >
        Matches every X theme
      </div>

      {/* Three theme cards */}
      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {THEMES.map((theme, i) => {
          const cardDelay = i * 10;
          const cardScale = spring({
            frame: frame - 15 - cardDelay,
            fps,
            config: { damping: 12, stiffness: 150, mass: 0.8 },
          });
          const cardOpacity = interpolate(
            frame,
            [15 + cardDelay, 25 + cardDelay],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={theme.key}
              style={{
                transform: `scale(${Math.max(0, cardScale)})`,
                opacity: cardOpacity,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Mini browser window */}
              <div
                style={{
                  width: 360,
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                {/* Browser chrome */}
                <div
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '8px 12px',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#febc2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#28c840' }} />
                  <div
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      backgroundColor: '#2a2a2a',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11,
                      color: '#888',
                    }}
                  >
                    x.com
                  </div>
                </div>
                {/* Content area */}
                <div
                  style={{
                    backgroundColor: theme.bgColor,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Mock text area */}
                  <div
                    style={{
                      fontSize: 15,
                      color: THEME_COLORS[theme.key].text,
                      padding: '8px 0',
                    }}
                  >
                    Feeling{' '}
                    <span style={{ color: COLORS.accentBlue }}>:hea</span>
                  </div>
                  {/* Autocomplete popup */}
                  <MockAutocomplete
                    items={DEMO_ITEMS}
                    selectedIndex={1}
                    theme={theme.key}
                    width={280}
                  />
                </div>
              </div>
              {/* Theme label */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                }}
              >
                {theme.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 20,
          color: COLORS.textSecondary,
          opacity: interpolate(frame, [50, 65], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Light · Dim · Dark
      </div>
    </div>
  );
};
