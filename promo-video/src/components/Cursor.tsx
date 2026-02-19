import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS } from '../styles/theme';

export const Cursor: React.FC<{
  color?: string;
  height?: number;
  blinkSpeed?: number;
}> = ({ color = COLORS.accentBlue, height = 24, blinkSpeed = 15 }) => {
  const frame = useCurrentFrame();
  const opacity = Math.sin((frame / blinkSpeed) * Math.PI) > 0 ? 1 : 0;

  return (
    <span
      style={{
        display: 'inline-block',
        width: 2,
        height,
        backgroundColor: color,
        opacity,
        verticalAlign: 'text-bottom',
        marginLeft: 1,
      }}
    />
  );
};
