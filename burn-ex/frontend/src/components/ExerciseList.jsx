import React, { useState, useEffect, useCallback } from 'react';
import { ShuffleIcon, TrashIcon, ExternalLinkIcon, SearchIcon } from '../utils/icons';
import { getExercises } from '../services/api';
import ExerciseDetailModal from './ExerciseDetailModal';

// ── Helpers ─────────────────────────────────────────────────────────────────

const getMuscleInitial = (muscle) => muscle?.charAt(0).toUpperCase() || '?';

const getDifficultyColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'beginner':    return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'intermediate':return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'expert':      return 'text-red-400 bg-red-400/10 border-red-400/30';
    default:            return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
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
      className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:border-red-500/50 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(exercise)}
    >
      {/* Muscle badge */}
      <div className="absolute top-4 left-4 z-10">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">{muscleInitial}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`absolute top-4 right-4 z-10 flex space-x-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(exercise); }}
          className="p-2 bg-gray-800 hover:bg-red-600 rounded-lg transition-colors"
        >
          <ExternalLinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(exId); }}
          className="p-2 bg-gray-800 hover:bg-red-600 rounded-lg transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <div className="h-40 overflow-hidden bg-gray-800 relative">
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-lg font-bold mb-1 group-hover:text-red-400 transition-colors line-clamp-1">
          {exercise.name}
        </h3>
        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-3">
          <span>{exercise.equipment || 'Bodyweight'}</span>
          <span>•</span>
          <span className={`px-2 py-0.5 rounded-full text-xs border ${getDifficultyColor(exercise.level)}`}>
            {exercise.level || 'All Levels'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {exercise.category && (
            <span className="px-2 py-1 bg-gray-700 rounded-full text-xs">{exercise.category}</span>
          )}
          {exercise.primaryMuscles?.slice(0, 2).map((muscle) => (
            <span key={muscle} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30">
              {muscle}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-red-400">{exercise.primaryMuscles?.length || 1}</div>
            <div className="text-xs text-gray-400">Primary</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{exercise.secondaryMuscles?.length || 0}</div>
            <div className="text-xs text-gray-400">Secondary</div>
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
      setError('Failed to load exercises. Make sure the backend is running.');
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
      <div className="inline-block w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-400">Loading exercises…</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={fetchData} className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition">
        Retry
      </button>
    </div>
  );

  return (
    <div>
      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-red-500"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-red-500"
          >
            {difficulties.map((d) => (
              <option key={d} value={d} className="capitalize">{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
          <span className="text-sm text-gray-400">{filtered.length} exercises</span>
          <button
            onClick={handleShuffle}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <ShuffleIcon className="w-4 h-4" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* ── Category pills ─────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.slice(0, 6).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-lg text-sm capitalize transition ${
              filter === cat ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* ── Cards / empty state ────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
            <SearchIcon className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Exercises Match</h3>
          <p className="text-gray-400 mb-6">Try adjusting your search or filters.</p>
          <button
            onClick={() => { setSearchQuery(''); setDifficulty('all'); setFilter('all'); }}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg"
          >
            Clear Filters
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
