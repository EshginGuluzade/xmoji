import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion';
import { COLORS, FONT_FAMILY, SPRING_CONFIG, VIDEO_WIDTH, VIDEO_HEIGHT } from '../styles/theme';

const EMOJI_GRID = [
  ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊'],
  ['😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜'],
  ['🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑'],
  ['😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴'],
  ['😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳'],
  ['🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲'],
  ['😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖'],
  ['😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿'],
];

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Compose box spring in
  const boxScale = spring({
    frame,
    fps,
    config: SPRING_CONFIG,
  });

  // Emoji picker appears at frame 30
  const pickerOpacity = interpolate(frame, [30, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scroll effect on emoji grid (frames 50-100)
  const scrollOffset = interpolate(frame, [50, 100], [0, -120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });

  // Frustration X appears at frame 105
  const xScale = spring({
    frame: frame - 105,
    fps,
    config: { damping: 8, stiffness: 300, mass: 0.5 },
  });

  // "Too slow..." text fades in at frame 115
  const slowTextOpacity = interpolate(frame, [115, 130], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        background: `radial-gradient(ellipse at center, #0a0a0a 0%, ${COLORS.background} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        position: 'relative',
      }}
    >
      {/* Mock compose box */}
      <div
        style={{
          transform: `scale(${boxScale})`,
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* Compose area */}
        <div
          style={{
            width: 500,
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d9bf0, #1a8cd8)',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 20,
                color: COLORS.textSecondary,
                paddingTop: 10,
              }}
            >
              What is happening?!
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {['🖼️', '📊', '😊', '📅', '📍'].map((icon, i) => (
                <div key={i} style={{ fontSize: 18, color: COLORS.accentBlue, opacity: 0.8 }}>
                  {icon}
                </div>
              ))}
            </div>
            <div
              style={{
                backgroundColor: COLORS.accentBlue,
                opacity: 0.5,
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                padding: '8px 20px',
                borderRadius: 9999,
              }}
            >
              Post
            </div>
          </div>
        </div>

        {/* Emoji picker */}
        <div
          style={{
            opacity: pickerOpacity,
            width: 340,
            height: 300,
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Search bar */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                backgroundColor: '#16181c',
                borderRadius: 20,
                padding: '8px 12px',
                fontSize: 14,
                color: COLORS.textSecondary,
              }}
            >
              Search emoji...
            </div>
          </div>
          {/* Emoji grid */}
          <div
            style={{
              padding: 8,
              transform: `translateY(${scrollOffset}px)`,
            }}
          >
            {EMOJI_GRID.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 2 }}>
                {row.map((emoji, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: 26,
                      height: 26,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      borderRadius: 4,
                    }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Frustration overlay */}
          {frame > 100 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 80,
                  color: '#e0245e',
                  fontWeight: 900,
                  transform: `scale(${Math.max(0, xScale)})`,
                }}
              >
                ✕
              </div>
            </div>
          )}
        </div>
      </div>

      {/* "Too slow..." text */}
      <div
        style={{
          marginTop: 40,
          fontSize: 32,
          color: COLORS.textSecondary,
          fontWeight: 500,
          opacity: slowTextOpacity,
          fontFamily: FONT_FAMILY,
        }}
      >
        Too slow...
      </div>
    </div>
  );
};
