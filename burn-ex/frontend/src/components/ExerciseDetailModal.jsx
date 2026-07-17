import React, { useState } from 'react';

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
      case 'beginner': return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
      case 'intermediate': return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
      case 'expert': return 'border-primary/20 bg-primary/10 text-primary';
      default: return 'border-outline-variant bg-surface-container-high text-on-surface-variant';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-surface rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-outline-variant shadow-2xl flex flex-col animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 bg-surface/90 backdrop-blur-xl border-b border-outline-variant p-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1.5 hover:bg-surface-variant rounded-full text-on-surface-variant hover:text-on-surface transition flex items-center">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
              <h2 className="text-lg md:text-xl font-extrabold text-on-surface font-display-md">{exercise.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${getDifficultyColor(exercise.level)}`}>
                {exercise.level || 'All Levels'}
              </span>
            </div>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-70px)]">
            {/* Left column – images & instructions */}
            <div className="space-y-6">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-surface-container border border-outline-variant shadow-inner">
                <img src={imageUrls[0]} alt={exercise.name} className="w-full h-full object-cover" />
              </div>

              <div className="glass-card p-5 rounded-2xl border border-outline-variant">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2 font-label-bold">
                  <span className="material-symbols-outlined text-sm text-primary">menu_book</span>
                  Execution Steps
                </h3>
                {exercise.instructions?.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-on-surface leading-relaxed">{exercise.instructions[currentStep]}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                      <button
                        onClick={() => setCurrentStep(prev => (prev > 0 ? prev - 1 : exercise.instructions.length - 1))}
                        className="p-2 bg-surface hover:bg-surface-variant border border-outline-variant rounded-xl text-on-surface-variant hover:text-on-surface transition flex items-center"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                      </button>
                      <span className="text-xs font-bold text-on-surface-variant">
                        Step {currentStep + 1} of {exercise.instructions.length}
                      </span>
                      <button
                        onClick={() => setCurrentStep(prev => (prev < exercise.instructions.length - 1 ? prev + 1 : 0))}
                        className="p-2 bg-surface hover:bg-surface-variant border border-outline-variant rounded-xl text-on-surface-variant hover:text-on-surface transition flex items-center"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant text-center py-4">No instructions available.</p>
                )}
              </div>
            </div>

            {/* Right column – details */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-tertiary">center_focus_strong</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Primary Targets</p>
                      <p className="text-lg font-extrabold text-on-surface">{exercise.primaryMuscles?.length || 1}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-secondary">adjust</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Secondary Targets</p>
                      <p className="text-lg font-extrabold text-on-surface">{exercise.secondaryMuscles?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 font-label-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">fitness_center</span>
                  Required Equipment
                </h3>
                <p className="text-sm font-semibold text-on-surface capitalize">{exercise.equipment || 'Bodyweight'}</p>
              </div>

              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label-bold">Target Muscles</h3>
                {exercise.primaryMuscles?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Primary Muscle Groups</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.primaryMuscles.map(m => (
                        <span key={m} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {exercise.secondaryMuscles?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Secondary Muscle Groups</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.secondaryMuscles.map(m => (
                        <span key={m} className="px-3 py-1 bg-surface-container-highest border border-outline-variant text-on-surface rounded-full text-xs font-bold uppercase tracking-wider">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={onClose}
                className="w-full py-3 bg-primary hover:bg-primary/95 text-on-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition duration-200 active:scale-98 shadow-lg shadow-primary/20 font-label-bold"
              >
                <span className="material-symbols-outlined text-lg">add_task</span>
                <span>Add to Workout Routine</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExerciseDetailModal;
