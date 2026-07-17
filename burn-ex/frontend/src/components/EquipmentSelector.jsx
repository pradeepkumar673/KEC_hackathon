import React from 'react';
import {
  DumbbellIcon,
  CheckIcon,
  TargetIcon,
  UsersIcon,
  SparklesIcon,
  TrophyIcon,
  ListIcon,
  FlameIcon
} from '../utils/icons';

const equipmentData = [
  { id: 'barbell', name: 'Barbell', icon: <DumbbellIcon className="w-6 h-6" /> },
  { id: 'dumbbell', name: 'Dumbbells', icon: <DumbbellIcon className="w-6 h-6" /> },
  { id: 'kettlebell', name: 'Kettlebell', icon: <TrophyIcon className="w-6 h-6" /> },
  { id: 'body only', name: 'Bodyweight', icon: <UsersIcon className="w-6 h-6" /> },
  { id: 'cable', name: 'Cable Machine', icon: <ListIcon className="w-6 h-6" /> },
  { id: 'machine', name: 'Machines', icon: <SparklesIcon className="w-6 h-6" /> },
  { id: 'bands', name: 'Resistance Bands', icon: <FlameIcon className="w-6 h-6" /> },
  { id: 'ez curl bar', name: 'EZ Curl Bar', icon: <TargetIcon className="w-6 h-6" /> },
];

function EquipmentSelector({ selectedEquipment, onSelect }) {
  const toggleEquipment = (id) => {
    const newSelection = selectedEquipment.includes(id)
      ? selectedEquipment.filter(item => item !== id)
      : [...selectedEquipment, id];
    onSelect(newSelection);
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3">Select Your Equipment</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose the equipment you have access to. We'll find exercises that match.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        {equipmentData.map((item) => {
          const isSelected = selectedEquipment.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleEquipment(item.id)}
              className={`
                relative p-6 rounded-xl border transition-all
                ${isSelected
                  ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                }
              `}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="flex flex-col items-center space-y-3">
                <div className="text-gray-200">{item.icon}</div>
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {isSelected ? 'Selected' : 'Click to select'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Selected Equipment</h3>
            <p className="text-gray-400 text-sm">
              {selectedEquipment.length > 0
                ? selectedEquipment.map(id => equipmentData.find(e => e.id === id)?.name).join(', ')
                : 'None selected'}
            </p>
          </div>
          <button
            onClick={() => onSelect([])}
            disabled={selectedEquipment.length === 0}
            className="px-6 py-2 text-gray-400 hover:text-white transition disabled:opacity-30"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentSelector;
