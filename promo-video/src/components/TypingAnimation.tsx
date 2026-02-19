import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS, FONT_FAMILY } from '../styles/theme';
import { Cursor } from './Cursor';

export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'shortcode'; code: string; emoji: string };

export const TypingAnimation: React.FC<{
  segments: TextSegment[];
  startFrame?: number;
  charsPerFrame?: number;
  showCursor?: boolean;
  fontSize?: number;
  convertedShortcodes?: Set<number>;
}> = ({
  segments,
  startFrame = 0,
  charsPerFrame = 0.4,
  showCursor = true,
  fontSize = 20,
  convertedShortcodes,
}) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  if (relFrame < 0) return null;

  const totalChars = segments.reduce((acc, seg) => {
    if (seg.type === 'text') return acc + seg.value.length;
    return acc + seg.code.length + 2; // including colons
  }, 0);

  const charsTyped = Math.min(Math.floor(relFrame * charsPerFrame), totalChars);

  let charCount = 0;
  const rendered: React.ReactNode[] = [];

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.type === 'text') {
      const segLen = seg.value.length;
      if (charCount >= charsTyped) break;
      const visibleChars = Math.min(segLen, charsTyped - charCount);
      rendered.push(
        <span key={`text-${si}`}>{seg.value.slice(0, visibleChars)}</span>
      );
      charCount += segLen;
    } else {
      const fullCode = `:${seg.code}:`;
      const segLen = fullCode.length;
      if (charCount >= charsTyped) break;
      const visibleChars = Math.min(segLen, charsTyped - charCount);
      const isFullyTyped = visibleChars === segLen;
      const isConverted = convertedShortcodes?.has(si) ?? isFullyTyped;

      if (isConverted && isFullyTyped) {
        rendered.push(
          <span
            key={`emoji-${si}`}
            style={{
              display: 'inline-block',
              transform: `scale(${interpolate(
                relFrame - (charCount + segLen) / charsPerFrame,
                [0, 5],
                [1.4, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
            }}
          >
            {seg.emoji}
          </span>
        );
      } else {
        const partial = fullCode.slice(0, visibleChars);
        const isTyping = visibleChars > 0;
        rendered.push(
          <span
            key={`code-${si}`}
            style={{
              color: isTyping ? COLORS.accentBlue : COLORS.textPrimary,
            }}
          >
            {partial}
          </span>
        );
      }
      charCount += segLen;
    }
  }

  const doneTyping = charsTyped >= totalChars;

  return (
    <span
      style={{
        fontSize,
        fontFamily: FONT_FAMILY,
        color: COLORS.textPrimary,
        lineHeight: 1.5,
      }}
    >
      {rendered}
      {showCursor && !doneTyping && <Cursor height={fontSize} />}
    </span>
  );
};
