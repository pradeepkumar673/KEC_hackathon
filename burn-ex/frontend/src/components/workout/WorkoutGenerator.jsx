import React, { useState } from 'react';
import EquipmentSelector from '../EquipmentSelector';
import MuscleSelector from '../MuscleSelector';
import ExerciseList from '../ExerciseList';

const STEPS = ['equipment', 'muscles', 'exercises'];

function WorkoutGenerator() {
  const [step, setStep] = useState(0);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="text-on-surface">
      {/* ── Sub Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface font-display-lg">
            Workout Generator
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm">
            Generate custom exercises based on your equipment and targets.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant text-xs font-semibold">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <span
                className={`capitalize transition-colors ${
                  i === step
                    ? 'text-primary font-bold'
                    : i < step
                    ? 'text-tertiary opacity-80'
                    : 'text-on-surface-variant opacity-40'
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <span className="material-symbols-outlined text-xs text-on-surface-variant opacity-40">chevron_right</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {step === 0 && (
          <EquipmentSelector
            selectedEquipment={selectedEquipment}
            onSelect={setSelectedEquipment}
            onNext={goNext}
          />
        )}

        {step === 1 && (
          <MuscleSelector
            selectedMuscles={selectedMuscles}
            onSelect={setSelectedMuscles}
            onBack={goBack}
          />
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-on-surface transition px-3 py-1.5 rounded-lg border border-outline-variant bg-surface"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              <div className="flex items-center gap-1.5 text-primary text-xs font-bold bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-sm animate-pulse">auto_awesome</span>
                <span>Tailored Routines</span>
              </div>
            </div>

            <ExerciseList
              selectedMuscles={selectedMuscles}
              selectedEquipment={selectedEquipment}
            />
          </div>
        )}

        {/* ── Navigation CTA (steps 0 & 1) ───────────────────── */}
        {step < 2 && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={goNext}
              disabled={step === 0 ? selectedEquipment.length === 0 : selectedMuscles.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary
                         disabled:opacity-40 disabled:cursor-not-allowed
                         rounded-xl font-bold transition-all duration-200
                         shadow-lg shadow-primary/20 active:scale-95 font-label-bold"
            >
              {step === 0 ? 'Choose Target Muscles' : 'Generate Exercises'}
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkoutGenerator;
