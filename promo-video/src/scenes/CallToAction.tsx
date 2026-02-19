import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { COLORS, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT } from '../styles/theme';
import { XmojiLogo } from '../components/XmojiLogo';
import { EmojiRain } from '../components/EmojiRain';

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Content fade in
  const contentOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button entrance
  const buttonScale = spring({
    frame: frame - 40,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.8 },
  });

  // Chrome Web Store text
  const storeTextOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Tagline
  const taglineOpacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shimmer effect on button
  const shimmerX = interpolate(frame % 60, [0, 60], [-100, 300], {
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
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Emoji rain background */}
      <EmojiRain count={25} speed={1} opacity={0.15} />

      {/* Main content */}
      <div
        style={{
          opacity: contentOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          zIndex: 1,
        }}
      >
        <XmojiLogo size={120} showTagline={false} />

        {/* Chrome Web Store text */}
        <div
          style={{
            fontSize: 22,
            color: COLORS.textSecondary,
            opacity: storeTextOpacity,
            marginTop: 8,
          }}
        >
          Available on Chrome Web Store
        </div>

        {/* Add to Chrome button */}
        <div
          style={{
            transform: `scale(${Math.max(0, buttonScale)})`,
            marginTop: 8,
          }}
        >
          <div
            style={{
              position: 'relative',
              backgroundColor: COLORS.accentBlue,
              color: '#ffffff',
              fontSize: 20,
              fontWeight: 700,
              padding: '16px 48px',
              borderRadius: 9999,
              overflow: 'hidden',
              fontFamily: FONT_FAMILY,
            }}
          >
            Add to Chrome
            {/* Shimmer overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: shimmerX,
                width: 60,
                height: '100%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                transform: 'skewX(-20deg)',
              }}
            />
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.textPrimary,
            opacity: taglineOpacity,
            marginTop: 16,
          }}
        >
          Type less. Express more.
        </div>
      </div>
    </div>
  );
};
