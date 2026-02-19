import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { COLORS, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT } from '../styles/theme';
import { MockComposeBox } from '../components/MockComposeBox';
import { Cursor } from '../components/Cursor';

// Define the typing sequence with precise frame timing
interface TypeStep {
  text: string;
  startFrame: number;
}

const TYPING_SPEED = 2.5; // frames per character

const STEPS: TypeStep[] = [
  { text: 'J', startFrame: 15 },
  { text: 'Ju', startFrame: 17 },
  { text: 'Jus', startFrame: 20 },
  { text: 'Just', startFrame: 22 },
  { text: 'Just ', startFrame: 25 },
  { text: 'Just s', startFrame: 27 },
  { text: 'Just sh', startFrame: 30 },
  { text: 'Just shi', startFrame: 32 },
  { text: 'Just ship', startFrame: 35 },
  { text: 'Just shipp', startFrame: 37 },
  { text: 'Just shippe', startFrame: 40 },
  { text: 'Just shipped', startFrame: 42 },
  { text: 'Just shipped ', startFrame: 45 },
  { text: 'Just shipped t', startFrame: 47 },
  { text: 'Just shipped th', startFrame: 50 },
  { text: 'Just shipped the', startFrame: 52 },
  { text: 'Just shipped the ', startFrame: 55 },
  { text: 'Just shipped the n', startFrame: 57 },
  { text: 'Just shipped the ne', startFrame: 60 },
  { text: 'Just shipped the new', startFrame: 62 },
  { text: 'Just shipped the new ', startFrame: 65 },
  { text: 'Just shipped the new f', startFrame: 67 },
  { text: 'Just shipped the new fe', startFrame: 70 },
  { text: 'Just shipped the new fea', startFrame: 72 },
  { text: 'Just shipped the new feat', startFrame: 75 },
  { text: 'Just shipped the new featu', startFrame: 77 },
  { text: 'Just shipped the new featur', startFrame: 80 },
  { text: 'Just shipped the new feature', startFrame: 82 },
  { text: 'Just shipped the new feature ', startFrame: 85 },
];

// Shortcode typing starts at frame 90
const SHORTCODE_1_START = 90;
const SHORTCODE_1_CHARS = ':rocket:'.split('');

// Second text + shortcode
const TEXT_2_START = 140;
const TEXT_2 = " Let's celebrate ";
const SHORTCODE_2_START = 195;
const SHORTCODE_2_CHARS = ':tada:'.split('');

export const ShortcodeDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Build the current display text
  const baseText = (() => {
    let t = '';
    for (const step of STEPS) {
      if (frame >= step.startFrame) t = step.text;
    }
    return t;
  })();

  // Shortcode 1 typing
  let shortcode1 = '';
  let shortcode1Complete = false;
  for (let i = 0; i < SHORTCODE_1_CHARS.length; i++) {
    if (frame >= SHORTCODE_1_START + i * TYPING_SPEED) {
      shortcode1 += SHORTCODE_1_CHARS[i];
    }
  }
  shortcode1Complete = shortcode1 === ':rocket:';

  // Conversion animation for rocket
  const rocketConvertFrame = SHORTCODE_1_START + SHORTCODE_1_CHARS.length * TYPING_SPEED + 5;
  const rocketConverted = frame >= rocketConvertFrame;
  const rocketPopScale = rocketConverted
    ? spring({
        frame: frame - rocketConvertFrame,
        fps,
        config: { damping: 6, stiffness: 300, mass: 0.5 },
      })
    : 0;

  // Second text typing
  let text2 = '';
  if (frame >= TEXT_2_START) {
    const charsTyped = Math.min(
      Math.floor((frame - TEXT_2_START) / TYPING_SPEED),
      TEXT_2.length
    );
    text2 = TEXT_2.slice(0, charsTyped);
  }
  const text2Complete = text2.length === TEXT_2.length;

  // Shortcode 2 typing
  let shortcode2 = '';
  let shortcode2Complete = false;
  if (frame >= SHORTCODE_2_START) {
    for (let i = 0; i < SHORTCODE_2_CHARS.length; i++) {
      if (frame >= SHORTCODE_2_START + i * TYPING_SPEED) {
        shortcode2 += SHORTCODE_2_CHARS[i];
      }
    }
    shortcode2Complete = shortcode2 === ':tada:';
  }

  const tadaConvertFrame = SHORTCODE_2_START + SHORTCODE_2_CHARS.length * TYPING_SPEED + 5;
  const tadaConverted = frame >= tadaConvertFrame;
  const tadaPopScale = tadaConverted
    ? spring({
        frame: frame - tadaConvertFrame,
        fps,
        config: { damping: 6, stiffness: 300, mass: 0.5 },
      })
    : 0;

  // All typing done?
  const allDone = tadaConverted && frame > tadaConvertFrame + 10;

  // Callout fade in
  const calloutOpacity = interpolate(frame, [260, 280], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Box entrance
  const boxScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120, mass: 1 },
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
        gap: 32,
      }}
    >
      {/* Scene title */}
      <div
        style={{
          fontSize: 28,
          color: COLORS.textSecondary,
          fontWeight: 500,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Type shortcodes, get emoji
      </div>

      <div style={{ transform: `scale(${boxScale})` }}>
        <MockComposeBox width={650}>
          <span style={{ fontSize: 20, color: COLORS.textPrimary, lineHeight: 1.5 }}>
            {baseText}
            {/* Shortcode 1 */}
            {shortcode1 && !rocketConverted && (
              <span style={{ color: COLORS.accentBlue }}>{shortcode1}</span>
            )}
            {rocketConverted && (
              <span
                style={{
                  display: 'inline-block',
                  transform: `scale(${rocketPopScale})`,
                  fontSize: 22,
                }}
              >
                🚀
              </span>
            )}
            {/* Second text */}
            {text2}
            {/* Shortcode 2 */}
            {shortcode2 && !tadaConverted && (
              <span style={{ color: COLORS.accentBlue }}>{shortcode2}</span>
            )}
            {tadaConverted && (
              <span
                style={{
                  display: 'inline-block',
                  transform: `scale(${tadaPopScale})`,
                  fontSize: 22,
                }}
              >
                🎉
              </span>
            )}
            {!allDone && <Cursor height={22} />}
          </span>
        </MockComposeBox>
      </div>

      {/* Callout */}
      <div
        style={{
          opacity: calloutOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(29, 155, 240, 0.1)',
          border: `1px solid ${COLORS.accentBlue}`,
          borderRadius: 12,
          padding: '12px 24px',
        }}
      >
        <span style={{ fontSize: 20 }}>✨</span>
        <span style={{ fontSize: 18, color: COLORS.accentBlue, fontWeight: 600 }}>
          3,500+ emoji supported
        </span>
      </div>
    </div>
  );
};
