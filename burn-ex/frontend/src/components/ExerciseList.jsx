import React, { useState, useEffect, useCallback } from 'react';
import { getExercises } from '../services/api';
import ExerciseDetailModal from './ExerciseDetailModal';

// ── Helpers ─────────────────────────────────────────────────────────────────

const getMuscleInitial = (muscle) => muscle?.charAt(0).toUpperCase() || '?';

const getDifficultyColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'beginner':    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'intermediate':return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'expert':      return 'text-primary bg-primary/10 border-primary/20';
    default:            return 'text-on-surface-variant bg-surface-container-highest border-outline-variant';
  }
};

// ── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onSelect, onDelete }) {
  const [isHovered, setIsHovered] = useState(false);
  const primaryMuscle = exercise.primaryMuscles?.[0] || 'full';
  const muscleInitial = getMuscleInitial(primaryMuscle);
  const imageUrl = exercise.images?.[0]
    ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exercise.images[0]}`
    : `https://images.unsplash.com/photo-1536922246289-88c42f957773?w=400&h=300&fit=crop&crop=center`;

  const exId = exercise.id || exercise._id;

  return (
    <div
      className="group relative bg-surface border border-outline-variant rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col h-full shadow-sm hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(exercise)}
    >
      {/* Muscle badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-on-primary font-extrabold text-xs">{muscleInitial}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`absolute top-3 right-3 z-10 flex gap-1.5 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(exercise); }}
          className="w-8 h-8 bg-surface-container-high border border-outline-variant hover:bg-primary hover:text-on-primary rounded-lg transition-colors flex items-center justify-center text-on-surface"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(exId); }}
          className="w-8 h-8 bg-surface-container-high border border-outline-variant hover:bg-primary hover:text-on-primary rounded-lg transition-colors flex items-center justify-center text-on-surface"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>

      {/* Image */}
      <div className="h-40 overflow-hidden bg-surface-container-low relative">
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-bold mb-1 group-hover:text-primary transition-colors line-clamp-1 text-on-surface">
          {exercise.name}
        </h3>
        
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mb-3 font-semibold uppercase tracking-wider">
          <span className="capitalize">{exercise.equipment || 'Bodyweight'}</span>
          <span>•</span>
          <span className={`px-2 py-0.5 rounded-full border ${getDifficultyColor(exercise.level)}`}>
            {exercise.level || 'All Levels'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {exercise.category && (
            <span className="px-2 py-0.5 bg-surface-container-highest border border-outline-variant rounded-full text-[10px] uppercase font-bold text-on-surface-variant">
              {exercise.category}
            </span>
          )}
          {exercise.primaryMuscles?.slice(0, 2).map((muscle) => (
            <span key={muscle} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/15 rounded-full text-[10px] uppercase font-bold">
              {muscle}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant mt-auto text-center">
          <div>
            <div className="text-sm font-extrabold text-primary">{exercise.primaryMuscles?.length || 1}</div>
            <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Primary</div>
          </div>
          <div>
            <div className="text-sm font-extrabold text-tertiary">{exercise.secondaryMuscles?.length || 0}</div>
            <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Secondary</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ExerciseList ─────────────────────────────────────────────────────────────

function ExerciseList({ selectedMuscles = [], selectedEquipment = [] }) {
  const [exercises, setExercises]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [filter, setFilter]               = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [difficulty, setDifficulty]       = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedMuscles.length > 0)   filters.muscles   = selectedMuscles;
      if (selectedEquipment.length > 0) filters.equipment = selectedEquipment;
      const data = await getExercises(filters);
      setExercises(data?.exercises || data || []);
    } catch {
      setError('Failed to fetch matched exercises. Please verify if the API server is active.');
    } finally {
      setLoading(false);
    }
  }, [selectedMuscles, selectedEquipment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleShuffle = () =>
    setExercises((prev) => [...prev].sort(() => Math.random() - 0.5));

  const handleDelete = (id) =>
    setExercises((prev) => prev.filter((e) => (e.id || e._id) !== id));

  const categories   = ['all', ...new Set(exercises.map((ex) => ex.category).filter(Boolean))];
  const difficulties = ['all', 'beginner', 'intermediate', 'expert'];

  const filtered = exercises.filter((ex) => {
    const matchesCategory   = filter === 'all'     || ex.category?.toLowerCase() === filter.toLowerCase();
    const matchesSearch     = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficulty === 'all' || ex.level?.toLowerCase() === difficulty.toLowerCase();
    return matchesCategory && matchesSearch && matchesDifficulty;
  });

  if (loading) return (
    <div className="text-center py-20">
      <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs text-on-surface-variant font-medium">Assembling routine database...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 space-y-4">
      <p className="text-xs text-primary font-bold">{error}</p>
      <button 
        onClick={fetchData} 
        className="px-5 py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-xl text-xs font-bold transition duration-200 shadow-lg shadow-primary/10"
      >
        Retry Sync
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-surface rounded-2xl border border-outline-variant">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
            <input
              type="text"
              placeholder="Search exercise catalogue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary placeholder-on-surface-variant text-on-surface"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:ring-1 focus:ring-primary focus:border-primary capitalize font-semibold"
          >
            {difficulties.map((d) => (
              <option key={d} value={d} className="capitalize">{d === 'all' ? 'All Experience Levels' : d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
          <span className="text-xs text-on-surface-variant font-bold">{filtered.length} matching exercises</span>
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant bg-surface hover:bg-surface-variant rounded-xl text-xs font-bold text-on-surface transition duration-200"
          >
            <span className="material-symbols-outlined text-xs">shuffle</span>
            <span>Shuffle Order</span>
          </button>
        </div>
      </div>

      {/* ── Category pills ─────────────────────────────────────── */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all duration-200 active:scale-95 ${
                filter === cat
                  ? 'bg-primary text-on-primary border-transparent shadow-sm'
                  : 'bg-surface border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant'
              }`}
            >
              {cat === 'all' ? 'All categories' : cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Cards / empty state ────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((ex) => (
            <ExerciseCard
              key={ex.id || ex._id}
              exercise={ex}
              onSelect={setSelectedExercise}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-outline-variant rounded-2xl bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">zoom_out</span>
          <h3 className="text-base font-bold mb-1 text-on-surface">No Exercises Match</h3>
          <p className="text-xs text-on-surface-variant mb-4">Try adjusting your filter checklist or search phrase.</p>
          <button
            onClick={() => { setSearchQuery(''); setDifficulty('all'); setFilter('all'); }}
            className="bg-primary hover:bg-primary/95 text-on-primary px-5 py-2 rounded-xl text-xs font-bold transition duration-200 shadow-lg shadow-primary/10"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* ── Detail modal ───────────────────────────────────────── */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
}

export default ExerciseList;
