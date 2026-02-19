import React from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';
import { VIDEO_WIDTH, VIDEO_HEIGHT } from '../styles/theme';

const EMOJIS = ['😀', '🎉', '🚀', '❤️', '👍', '🔥', '✨', '💜', '😎', '🎊', '💚', '⭐', '🌈', '💪', '🙌'];

export const EmojiRain: React.FC<{
  count?: number;
  speed?: number;
  opacity?: number;
}> = ({ count = 20, speed = 1.5, opacity = 0.3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emojis = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      emoji: EMOJIS[Math.floor(random(`emoji-${i}`) * EMOJIS.length)],
      x: random(`x-${i}`) * VIDEO_WIDTH,
      startY: -50 - random(`startY-${i}`) * 200,
      size: 20 + random(`size-${i}`) * 30,
      speed: speed * (0.5 + random(`speed-${i}`) * 1),
      wobbleAmp: 10 + random(`wobble-${i}`) * 20,
      wobbleFreq: 0.02 + random(`freq-${i}`) * 0.03,
      rotation: random(`rot-${i}`) * 360,
    }));
  }, [count, speed]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {emojis.map((e, i) => {
        const y = e.startY + (frame / fps) * e.speed * 120;
        const x = e.x + Math.sin(frame * e.wobbleFreq) * e.wobbleAmp;
        const rot = e.rotation + frame * 0.5;
        const wrappedY = ((y % (VIDEO_HEIGHT + 300)) + VIDEO_HEIGHT + 300) % (VIDEO_HEIGHT + 300) - 150;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: wrappedY,
              fontSize: e.size,
              opacity,
              transform: `rotate(${rot}deg)`,
            }}
          >
            {e.emoji}
          </div>
        );
      })}
    </div>
  );
};
