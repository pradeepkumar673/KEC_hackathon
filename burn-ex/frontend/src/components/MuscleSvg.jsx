import React from 'react';
import { AbdominalsGroup } from './muscles/AbdominalsGroup';
import { BackGroup } from './muscles/BackGroup';
import { BicepsGroup } from './muscles/BicepsGroup';
import { CalvesGroup } from './muscles/CalvesGroup';
import { ChestGroup } from './muscles/ChestGroup';
import { ForearmsGroup } from './muscles/ForearmsGroup';
import { GlutesGroup } from './muscles/GlutesGroup';
import { HamstringsGroup } from './muscles/HamstringsGroup';
import { ObliquesGroup } from './muscles/ObliquesGroup';
import { QuadricepsGroup } from './muscles/QuadricepsGroup';
import { ShouldersGroup } from './muscles/ShouldersGroup';
import { TrapsGroup } from './muscles/TrapsGroup';
import { TricepsGroup } from './muscles/TricepsGroup';

const MuscleSvg = ({ selectedMuscles = [], onToggleMuscle }) => {
  const getMuscleClasses = (muscle) => {
    const base = "transition-all duration-200 cursor-pointer";
    const isSelected = selectedMuscles.includes(muscle);
    const hover = "hover:fill-primary/50 hover:stroke-primary/80";
    if (isSelected) {
      return `${base} fill-primary stroke-primary/20 ${hover}`;
    }
    return `${base} fill-surface-container-highest stroke-outline-variant ${hover}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <svg
        viewBox="0 0 512 512"
        className="w-full h-auto"
        style={{ maxHeight: '500px' }}
      >
        <AbdominalsGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <BackGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <BicepsGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <CalvesGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <ChestGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <ForearmsGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <GlutesGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <HamstringsGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <ObliquesGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <QuadricepsGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <ShouldersGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <TrapsGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
        <TricepsGroup onToggleMuscle={onToggleMuscle} getMuscleClasses={getMuscleClasses} />
      </svg>
    </div>
  );
};

export default MuscleSvg;
