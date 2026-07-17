import React from 'react';
import MuscleSvg from './MuscleSvg';

const musclePresets = [
  { id: 'push', name: 'Push Day', muscles: ['chest', 'shoulders', 'triceps'] },
  { id: 'pull', name: 'Pull Day', muscles: ['back', 'biceps', 'traps'] },
  { id: 'legs', name: 'Leg Day', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
  { id: 'full', name: 'Full Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves'] },
];

function MuscleSelector({ selectedMuscles, onSelect, onBack }) {
  const toggleMuscle = (muscleId) => {
    const newSelection = selectedMuscles.includes(muscleId)
      ? selectedMuscles.filter(id => id !== muscleId)
      : [...selectedMuscles, muscleId];
    onSelect(newSelection);
  };

  const selectPreset = (presetMuscles) => {
    onSelect(presetMuscles);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center py-4">
        <h2 className="text-xl font-bold mb-2 font-display-md text-on-surface">Target Your Muscles</h2>
        <p className="text-on-surface-variant text-xs max-w-lg mx-auto">
          Tap on the skeletal map to highlight your targets, or choose a predefined preset.
        </p>
      </div>

      {/* Quick Select Presets */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2 font-label-bold">
          <span className="material-symbols-outlined text-sm text-primary">track_changes</span>
          Quick Selection Presets
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {musclePresets.map(preset => {
            const isActive = preset.muscles.every(m => selectedMuscles.includes(m)) &&
              preset.muscles.length === selectedMuscles.length;
            return (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset.muscles)}
                className={`p-4 rounded-xl border text-left transition duration-300 active:scale-95 flex flex-col gap-1 ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(255,180,170,0.1)] text-primary font-bold'
                    : 'border-outline-variant bg-surface hover:border-on-surface-variant'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-on-surface">{preset.name}</span>
                  {isActive && (
                    <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant">{preset.muscles.length} targeted groups</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Muscle Diagram */}
      <div className="rounded-2xl border border-primary/20 bg-[#2b1c1a] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_45px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Interactive muscle map</span>
          <span className="text-[10px] text-primary">Hover to preview effort</span>
        </div>
        <MuscleSvg
          selectedMuscles={selectedMuscles}
          onToggleMuscle={toggleMuscle}
        />
      </div>

      {/* Selected Muscles Summary */}
      <div className="glass-card p-5 rounded-2xl border border-outline-variant">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-xs uppercase tracking-widest text-on-surface-variant font-label-bold">
                Target Groups Checklist
              </h3>
              <span className="px-2 py-0.5 bg-primary/15 border border-primary/20 text-primary rounded-full text-[10px] font-bold">
                {selectedMuscles.length} ACTIVE
              </span>
            </div>
            {selectedMuscles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedMuscles.map(muscle => (
                  <div
                    key={muscle}
                    className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high border border-outline-variant rounded-full text-xs font-semibold text-on-surface uppercase tracking-wider"
                  >
                    <span>{muscle}</span>
                    <button
                      onClick={() => toggleMuscle(muscle)}
                      className="text-on-surface-variant hover:text-primary transition flex items-center"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant text-xs font-medium">No target groups selected yet. Tap the skeletal model above.</p>
            )}
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 border border-outline-variant text-xs text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant transition rounded-lg font-bold font-label-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
            Back to Equipment
          </button>
        </div>
      </div>
    </div>
  );
}

export default MuscleSelector;
