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
    const base = "muscle-region cursor-pointer fill-[#795b57] stroke-[#f1c4bd] [stroke-width:0.75] transition-[fill,stroke,filter,opacity] duration-300 ease-out";
    const isSelected = selectedMuscles.includes(muscle);
    if (isSelected) {
      return `${base} is-selected fill-[#ff5545] stroke-[#ffe1dc]`;
    }
    return base;
  };

  return (
    <div className="muscle-map w-full max-w-4xl mx-auto rounded-2xl p-3 sm:p-6">
      <svg
        viewBox="0 0 512 512"
        className="w-full h-auto drop-shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
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
