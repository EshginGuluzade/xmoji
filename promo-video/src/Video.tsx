import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { HookScene } from './scenes/HookScene';
import { LogoReveal } from './scenes/LogoReveal';
import { ShortcodeDemo } from './scenes/ShortcodeDemo';
import { AutocompleteDemo } from './scenes/AutocompleteDemo';
import { ThemeShowcase } from './scenes/ThemeShowcase';
import { CallToAction } from './scenes/CallToAction';

// Scene timings (frames at 30fps)
const SCENE_1_START = 0;
const SCENE_1_DURATION = 150; // 0-5s

const SCENE_2_START = 150;
const SCENE_2_DURATION = 120; // 5-9s

const SCENE_3_START = 270;
const SCENE_3_DURATION = 330; // 9-20s

const SCENE_4_START = 600;
const SCENE_4_DURATION = 300; // 20-30s

const SCENE_5_START = 900;
const SCENE_5_DURATION = 180; // 30-36s

const SCENE_6_START = 1080;
const SCENE_6_DURATION = 120; // 36-40s

const FADE_DURATION = 15; // frames for crossfade

const SceneFade: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
}> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, FADE_DURATION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - FADE_DURATION, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
    </AbsoluteFill>
  );
};

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <Sequence from={SCENE_1_START} durationInFrames={SCENE_1_DURATION}>
        <SceneFade durationInFrames={SCENE_1_DURATION}>
          <HookScene />
        </SceneFade>
      </Sequence>

      <Sequence from={SCENE_2_START} durationInFrames={SCENE_2_DURATION}>
        <SceneFade durationInFrames={SCENE_2_DURATION}>
          <LogoReveal />
        </SceneFade>
      </Sequence>

      <Sequence from={SCENE_3_START} durationInFrames={SCENE_3_DURATION}>
        <SceneFade durationInFrames={SCENE_3_DURATION}>
          <ShortcodeDemo />
        </SceneFade>
      </Sequence>

      <Sequence from={SCENE_4_START} durationInFrames={SCENE_4_DURATION}>
        <SceneFade durationInFrames={SCENE_4_DURATION}>
          <AutocompleteDemo />
        </SceneFade>
      </Sequence>

      <Sequence from={SCENE_5_START} durationInFrames={SCENE_5_DURATION}>
        <SceneFade durationInFrames={SCENE_5_DURATION}>
          <ThemeShowcase />
        </SceneFade>
      </Sequence>

      <Sequence from={SCENE_6_START} durationInFrames={SCENE_6_DURATION}>
        <SceneFade durationInFrames={SCENE_6_DURATION}>
          <CallToAction />
        </SceneFade>
      </Sequence>
    </AbsoluteFill>
  );
};
