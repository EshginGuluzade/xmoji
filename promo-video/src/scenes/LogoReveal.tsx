import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { COLORS, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT } from '../styles/theme';
import { XmojiLogo } from '../components/XmojiLogo';

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in from previous scene
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glow pulse effect
  const glowIntensity = interpolate(
    Math.sin((frame / 30) * Math.PI * 2),
    [-1, 1],
    [0.3, 0.8]
  );

  const glowScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 15, stiffness: 100, mass: 1 },
  });

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        background: `radial-gradient(ellipse at center, #0a0a0a 0%, ${COLORS.background} 70%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        opacity: fadeIn,
        position: 'relative',
      }}
    >
      {/* Glow behind logo */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(244, 168, 40, ${glowIntensity * 0.3}) 0%, transparent 70%)`,
          transform: `scale(${Math.max(0, glowScale)})`,
        }}
      />
      <XmojiLogo size={140} showTagline={true} />
    </div>
  );
};
