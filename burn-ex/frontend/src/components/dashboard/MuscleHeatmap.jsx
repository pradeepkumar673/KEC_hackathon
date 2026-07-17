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
  abdominals: AbdominalsGroup, back: BackGroup, biceps: BicepsGroup, calves: CalvesGroup,
  chest: ChestGroup, forearms: ForearmsGroup, glutes: GlutesGroup, hamstrings: HamstringsGroup,
  obliques: ObliquesGroup, quadriceps: QuadricepsGroup, shoulders: ShouldersGroup,
  traps: TrapsGroup, triceps: TricepsGroup,
};

const noop = () => {};
const noFillClass = () => 'transition-all duration-300'; // paths inherit fill/stroke from the wrapping <g> below

const heatColor = (value) => {
  if (!value) return { fill: '#374151', stroke: '#4B5563' };  // untrained this period
  if (value < 25) return { fill: '#3B82F6', stroke: '#60A5FA' };
  if (value < 50) return { fill: '#22C55E', stroke: '#4ADE80' };
  if (value < 75) return { fill: '#F59E0B', stroke: '#FBBF24' };
  return { fill: '#EF4444', stroke: '#F87171' };               // hardest trained
};

const MuscleHeatmap = ({ heatmap = {} }) => (
  <div>
    <svg viewBox="0 0 512 512" className="w-full h-auto" style={{ maxHeight: '420px' }}>
      {Object.entries(MUSCLE_GROUPS).map(([key, Group]) => (
        <g key={key} style={heatColor(heatmap[key])}>
          <Group onToggleMuscle={noop} getMuscleClasses={noFillClass} />
        </g>
      ))}
    </svg>
    <div className="flex justify-center gap-3 mt-2 text-[10px] text-gray-400 flex-wrap">
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-600 inline-block" /> Untrained</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Light</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Moderate</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Heavy</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Hardest trained</span>
    </div>
  </div>
);

export default MuscleHeatmap;
