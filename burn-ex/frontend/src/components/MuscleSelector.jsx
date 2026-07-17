import React, { useState } from 'react';
import MuscleSvg from './MuscleSvg';
import { CheckIcon, TargetIcon, ChevronRightIcon } from '../utils/icons';

// Quick‑select presets
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
    <div>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3">Target Your Muscles</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Click on the diagram to select the muscles you want to work.
        </p>
      </div>

      {/* Quick Select Presets */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TargetIcon className="w-5 h-5 mr-2 text-red-500" />
          Quick Select
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {musclePresets.map(preset => {
            const isActive = preset.muscles.every(m => selectedMuscles.includes(m)) &&
              preset.muscles.length === selectedMuscles.length;
            return (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset.muscles)}
                className={`p-3 rounded-lg border text-left transition ${
                  isActive
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{preset.name}</span>
                  {isActive && <CheckIcon className="w-4 h-4 text-red-500" />}
                </div>
                <p className="text-xs text-gray-400">{preset.muscles.length} muscles</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Muscle Diagram */}
      <div className="mb-8 bg-gray-800/30 rounded-xl p-4 border border-gray-700">
        <MuscleSvg
          selectedMuscles={selectedMuscles}
          onToggleMuscle={toggleMuscle}
        />
      </div>

      {/* Selected Muscles Summary */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">Selected Muscle Groups</h3>
              <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs font-medium">
                {selectedMuscles.length}
              </span>
            </div>
            {selectedMuscles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedMuscles.map(muscle => (
                  <div
                    key={muscle}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-700 rounded-full text-sm"
                  >
                    <span>{muscle}</span>
                    <button
                      onClick={() => toggleMuscle(muscle)}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">None selected – click on the diagram above.</p>
            )}
          </div>
          <button
            onClick={onBack}
            className="px-6 py-2 text-gray-400 hover:text-white transition"
          >
            Back to Equipment
          </button>
        </div>
      </div>
    </div>
  );
}

export default MuscleSelector;
