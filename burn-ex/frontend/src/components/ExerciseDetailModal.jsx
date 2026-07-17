import React, { useState } from 'react';
import { XIcon, ArrowLeftIcon, ChevronRightIcon, TargetIcon, DumbbellIcon, FlameIcon } from '../utils/icons';

function ExerciseDetailModal({ exercise, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const imageUrls = exercise.images?.map(img =>
    `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`
  ) || [
    'https://images.unsplash.com/photo-1536922246289-88c42f957773?w=800&h=600&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1549060279-7e168fce7090?w=800&h=600&fit=crop&crop=center'
  ];

  const getDifficultyColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-green-500/20 text-green-300';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-300';
      case 'expert': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="sticky top-0 bg-gray-900/90 backdrop-blur-lg border-b border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
                <XIcon className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold">{exercise.name}</h2>
              <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(exercise.level)}`}>
                {exercise.level || 'All Levels'}
              </span>
            </div>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Left column – images & instructions */}
            <div>
              <div className="relative mb-6 aspect-video rounded-xl overflow-hidden bg-gray-800">
                <img src={imageUrls[0]} alt={exercise.name} className="w-full h-full object-cover" />
              </div>
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="font-semibold mb-3 flex items-center">
                  <TargetIcon className="w-5 h-5 mr-2 text-red-500" />
                  Instructions
                </h3>
                {exercise.instructions?.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-gray-300">{exercise.instructions[currentStep]}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <button
                        onClick={() => setCurrentStep(prev => (prev > 0 ? prev - 1 : exercise.instructions.length - 1))}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-400">
                        Step {currentStep + 1} of {exercise.instructions.length}
                      </span>
                      <button
                        onClick={() => setCurrentStep(prev => (prev < exercise.instructions.length - 1 ? prev + 1 : 0))}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">No instructions available.</p>
                )}
              </div>
            </div>

            {/* Right column – details */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <TargetIcon className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-xs text-gray-400">Primary</p>
                      <p className="text-lg font-bold">{exercise.primaryMuscles?.length || 1}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <TargetIcon className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-xs text-gray-400">Secondary</p>
                      <p className="text-lg font-bold">{exercise.secondaryMuscles?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="font-semibold mb-3 flex items-center">
                  <DumbbellIcon className="w-5 h-5 mr-2 text-red-500" />
                  Equipment
                </h3>
                <p className="text-gray-300">{exercise.equipment || 'Bodyweight'}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="font-semibold mb-3">Target Muscles</h3>
                {exercise.primaryMuscles?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-2">Primary</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.primaryMuscles.map(m => (
                        <span key={m} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {exercise.secondaryMuscles?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Secondary</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.secondaryMuscles.map(m => (
                        <span key={m} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold flex items-center justify-center space-x-2 transition">
                <FlameIcon className="w-5 h-5" />
                <span>Add to My Workout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExerciseDetailModal;
