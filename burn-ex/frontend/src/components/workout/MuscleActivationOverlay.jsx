import React from 'react';
import { AbdominalsGroup } from '../muscles/AbdominalsGroup';
import { BackGroup } from '../muscles/BackGroup';
import { BicepsGroup } from '../muscles/BicepsGroup';
import { CalvesGroup } from '../muscles/CalvesGroup';
import { ChestGroup } from '../muscles/ChestGroup';
import { ForearmsGroup } from '../muscles/ForearmsGroup';
import { GlutesGroup } from '../muscles/GlutesGroup';
import { HamstringsGroup } from '../muscles/HamstringsGroup';
import { ObliquesGroup } from '../muscles/ObliquesGroup';
import { QuadricepsGroup } from '../muscles/QuadricepsGroup';
import { ShouldersGroup } from '../muscles/ShouldersGroup';
import { TrapsGroup } from '../muscles/TrapsGroup';
import { TricepsGroup } from '../muscles/TricepsGroup';

const MUSCLE_GROUPS = {
  abdominals: AbdominalsGroup,
  back: BackGroup,
  biceps: BicepsGroup,
  calves: CalvesGroup,
  chest: ChestGroup,
  forearms: ForearmsGroup,
  glutes: GlutesGroup,
  hamstrings: HamstringsGroup,
  obliques: ObliquesGroup,
  quadriceps: QuadricepsGroup,
  shoulders: ShouldersGroup,
  traps: TrapsGroup,
  triceps: TricepsGroup,
};

const noop = () => {};

// activation: 0 (rest / top of rep) → 1 (peak contraction), fed live from pose tracking
const MuscleActivationOverlay = ({ primaryMuscles = [], secondaryMuscles = [], activation = 0 }) => {
  const getMuscleClasses = (muscle) => {
    const base = 'transition-all duration-150 ease-out';

    if (primaryMuscles.includes(muscle)) {
      if (activation > 0.66) return `${base} fill-red-500 stroke-red-300`;
      if (activation > 0.33) return `${base} fill-red-600/80 stroke-red-400`;
      return `${base} fill-red-700/50 stroke-red-500/60`;
    }
    if (secondaryMuscles.includes(muscle)) {
      // Stabilizers glow softer and react less sharply than primary movers
      if (activation > 0.5) return `${base} fill-amber-500/70 stroke-amber-300`;
      return `${base} fill-amber-600/40 stroke-amber-500/50`;
    }
    // Keep non-targeted muscles as a very quiet silhouette. They are not part
    // of the activation calculation and should never read as active targets.
    return `${base} fill-[#2b2121] stroke-[#5c4644] opacity-45`;
  };

  return (
    <svg viewBox="0 0 512 512" className="w-full h-auto" style={{ maxHeight: '420px' }}>
      {Object.entries(MUSCLE_GROUPS).map(([key, Group]) => (
        <Group key={key} onToggleMuscle={noop} getMuscleClasses={getMuscleClasses} />
      ))}
    </svg>
  );
};

export default MuscleActivationOverlay;
