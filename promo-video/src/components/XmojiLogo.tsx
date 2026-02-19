import React from 'react';
import { Img, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { COLORS, FONT_FAMILY, SPRING_BOUNCE } from '../styles/theme';

export const XmojiLogo: React.FC<{
  showTagline?: boolean;
  size?: number;
}> = ({ showTagline = true, size = 120 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({
    frame,
    fps,
    config: SPRING_BOUNCE,
  });

  const textOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 20, stiffness: 100, mass: 1 },
  });

  const taglineOpacity = spring({
    frame: frame - 30,
    fps,
    config: { damping: 20, stiffness: 100, mass: 1 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ transform: `scale(${iconScale})` }}>
        <Img
          src={staticFile('icon128.png')}
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.2,
          }}
        />
      </div>
      <div
        style={{
          fontSize: size * 0.5,
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontFamily: FONT_FAMILY,
          opacity: textOpacity,
          transform: `translateY(${(1 - textOpacity) * 10}px)`,
        }}
      >
        Xmoji
      </div>
      {showTagline && (
        <div
          style={{
            fontSize: 24,
            color: COLORS.textSecondary,
            fontFamily: FONT_FAMILY,
            opacity: taglineOpacity,
            transform: `translateY(${(1 - taglineOpacity) * 10}px)`,
          }}
        >
          Slack-style emoji shortcodes for X
        </div>
      )}
    </div>
  );
};
