import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { COLORS, FONT_FAMILY, VIDEO_WIDTH, VIDEO_HEIGHT } from '../styles/theme';
import { MockComposeBox } from '../components/MockComposeBox';
import { MockAutocomplete } from '../components/MockAutocomplete';
import { Cursor } from '../components/Cursor';

const AUTOCOMPLETE_ITEMS = [
  { emoji: '❤️', name: 'heart' },
  { emoji: '💜', name: 'purple_heart' },
  { emoji: '💚', name: 'green_heart' },
  { emoji: '😍', name: 'heart_eyes' },
  { emoji: '💛', name: 'yellow_heart' },
];

const TYPING_SPEED = 3; // frames per char

export const AutocompleteDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Type "Feeling " (frames 10-40)
  const prefixText = 'Feeling ';
  const prefixCharsTyped = Math.min(
    Math.floor(Math.max(0, frame - 10) / TYPING_SPEED),
    prefixText.length
  );
  const typedPrefix = prefixText.slice(0, prefixCharsTyped);
  const prefixDone = prefixCharsTyped >= prefixText.length;

  // Phase 2: Type ":hea" (starts frame 50)
  const shortcodeStart = 50;
  const shortcodeChars = ':hea';
  const shortcodeCharsTyped = Math.min(
    Math.floor(Math.max(0, frame - shortcodeStart) / TYPING_SPEED),
    shortcodeChars.length
  );
  const typedShortcode = shortcodeChars.slice(0, shortcodeCharsTyped);
  const shortcodeReady = shortcodeCharsTyped >= 3; // at least ":he" to show popup

  // Phase 3: Popup appears (frame ~60)
  const popupAppearFrame = 62;
  const popupOpacity = interpolate(frame, [popupAppearFrame, popupAppearFrame + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const popupTranslateY = interpolate(frame, [popupAppearFrame, popupAppearFrame + 8], [8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase 4: Arrow key navigation (frames 100-180)
  // Selection starts at 0, moves down at specific frames
  let selectedIndex = 0;
  const moveFrames = [110, 130, 150, 170]; // frames when selection moves
  for (const mf of moveFrames) {
    if (frame >= mf) selectedIndex++;
  }
  // But we only want to go to index 0 (heart) — so wrap/cap:
  // 0 -> 1 -> 2 -> 3 -> back to 0
  // Actually: navigate down then back up to select heart
  // Simpler: just navigate down to 0 from start, don't move
  // Let's have: start at 0, move to 1, 2, then back to 0
  if (frame >= 110 && frame < 130) selectedIndex = 1;
  else if (frame >= 130 && frame < 150) selectedIndex = 2;
  else if (frame >= 150 && frame < 170) selectedIndex = 1;
  else if (frame >= 170) selectedIndex = 0;
  else selectedIndex = 0;

  // Phase 5: Press Enter — selection confirmed (frame 195)
  const enterFrame = 195;
  const isSelected = frame >= enterFrame;

  // After selection: popup disappears, emoji inserted
  const postSelectFrame = enterFrame + 5;
  const popupFadeOut = isSelected
    ? interpolate(frame, [enterFrame, postSelectFrame], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  // Emoji pop animation
  const emojiPopScale = frame >= postSelectFrame
    ? spring({
        frame: frame - postSelectFrame,
        fps,
        config: { damping: 6, stiffness: 300, mass: 0.5 },
      })
    : 0;

  // Callout
  const calloutOpacity = interpolate(frame, [220, 240], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Box entrance
  const boxScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120, mass: 1 },
  });

  // Keyboard hint
  const keyHintOpacity = interpolate(frame, [100, 115], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const keyHintFadeOut = isSelected
    ? interpolate(frame, [enterFrame, enterFrame + 10], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

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
        Smart autocomplete
      </div>

      <div style={{ transform: `scale(${boxScale})`, position: 'relative' }}>
        <MockComposeBox width={650}>
          <span style={{ fontSize: 20, color: COLORS.textPrimary, lineHeight: 1.5 }}>
            {typedPrefix}
            {!isSelected && typedShortcode && (
              <span style={{ color: COLORS.accentBlue }}>{typedShortcode}</span>
            )}
            {isSelected && (
              <span
                style={{
                  display: 'inline-block',
                  transform: `scale(${emojiPopScale})`,
                  fontSize: 22,
                }}
              >
                ❤️
              </span>
            )}
            {!isSelected && <Cursor height={22} />}
          </span>
        </MockComposeBox>

        {/* Autocomplete popup */}
        {shortcodeReady && frame >= popupAppearFrame && (
          <div
            style={{
              position: 'absolute',
              left: 80,
              top: 90,
              opacity: popupOpacity * popupFadeOut,
              transform: `translateY(${popupTranslateY}px)`,
            }}
          >
            <MockAutocomplete
              items={AUTOCOMPLETE_ITEMS}
              selectedIndex={selectedIndex}
              theme="dark"
            />
          </div>
        )}

        {/* Keyboard navigation hint */}
        {frame >= 100 && !isSelected && (
          <div
            style={{
              position: 'absolute',
              right: -200,
              top: 120,
              opacity: keyHintOpacity * keyHintFadeOut,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <KeyCap>↑</KeyCap>
              <KeyCap>↓</KeyCap>
            </div>
            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Navigate</span>
            {frame >= 180 && (
              <>
                <KeyCap>Enter ↵</KeyCap>
                <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Select</span>
              </>
            )}
          </div>
        )}
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
        <span style={{ fontSize: 20 }}>⌨️</span>
        <span style={{ fontSize: 18, color: COLORS.accentBlue, fontWeight: 600 }}>
          Arrow keys + Enter to select
        </span>
      </div>
    </div>
  );
};

const KeyCap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 36,
      height: 32,
      padding: '0 8px',
      backgroundColor: '#16181c',
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      fontSize: 14,
      color: COLORS.textPrimary,
      fontFamily: FONT_FAMILY,
      boxShadow: '0 2px 0 #2f3336',
    }}
  >
    {children}
  </div>
);
