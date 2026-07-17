import React, { useState } from 'react';
import EquipmentSelector from '../EquipmentSelector';
import MuscleSelector from '../MuscleSelector';
import ExerciseList from '../ExerciseList';
import { FlameIcon, SparklesIcon, ChevronRightIcon, ArrowLeftIcon } from '../../utils/icons';

const STEPS = ['equipment', 'muscles', 'exercises'];

function WorkoutGenerator() {
  const [step, setStep] = useState(0);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlameIcon className="w-7 h-7 text-red-500" />
            <span className="text-xl font-bold tracking-tight">Burn-Ex</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <span
                  className={`capitalize font-medium ${
                    i === step
                      ? 'text-red-400'
                      : i < step
                      ? 'text-green-400'
                      : 'text-gray-500'
                  }`}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-10">
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
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-2 text-red-400">
                <SparklesIcon className="w-5 h-5" />
                <span className="font-semibold">Your Workout</span>
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
          <div className="mt-10 flex justify-end">
            <button
              onClick={goNext}
              disabled={step === 0 ? selectedEquipment.length === 0 : selectedMuscles.length === 0}
              className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         rounded-xl font-semibold transition-all duration-200
                         shadow-lg shadow-red-900/30"
            >
              {step === 0 ? 'Choose Muscles' : 'Generate Workout'}
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default WorkoutGenerator;
