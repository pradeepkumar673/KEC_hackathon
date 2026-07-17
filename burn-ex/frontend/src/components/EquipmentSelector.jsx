import React from 'react';

const equipmentData = [
  { id: 'barbell', name: 'Barbell', icon: 'fitness_center' },
  { id: 'dumbbell', name: 'Dumbbells', icon: 'sports_gymnastics' },
  { id: 'kettlebell', name: 'Kettlebell', icon: 'sports_handball' },
  { id: 'body only', name: 'Bodyweight', icon: 'accessibility_new' },
  { id: 'cable', name: 'Cable Machine', icon: 'layers' },
  { id: 'machine', name: 'Machines', icon: 'settings' },
  { id: 'bands', name: 'Resistance Bands', icon: 'repeat' },
  { id: 'ez curl bar', name: 'EZ Curl Bar', icon: 'fitness_center' },
];

function EquipmentSelector({ selectedEquipment, onSelect }) {
  const toggleEquipment = (id) => {
    const newSelection = selectedEquipment.includes(id)
      ? selectedEquipment.filter(item => item !== id)
      : [...selectedEquipment, id];
    onSelect(newSelection);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center py-4">
        <h2 className="text-xl font-bold mb-2 font-display-md text-on-surface">Select Available Equipment</h2>
        <p className="text-on-surface-variant text-xs max-w-lg mx-auto">
          Choose the fitness tools you have at your disposal. We will tailor the list to fit what you have.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {equipmentData.map((item) => {
          const isSelected = selectedEquipment.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleEquipment(item.id)}
              className={`
                relative p-6 rounded-2xl border transition-all duration-300 active:scale-95 group text-center flex flex-col items-center justify-center gap-3
                ${isSelected
                  ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,180,170,0.15)] text-primary font-bold'
                  : 'border-outline-variant bg-surface hover:border-on-surface-variant hover:bg-surface-variant'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-sm">
                  <span className="material-symbols-outlined text-xs font-black">check</span>
                </div>
              )}
              <span className={`material-symbols-outlined text-3xl transition-transform duration-300 group-hover:scale-110 ${
                isSelected ? 'text-primary' : 'text-on-surface-variant'
              }`}>
                {item.icon}
              </span>
              <div>
                <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{item.name}</h3>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  {isSelected ? 'Active' : 'Tap to select'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="glass-card p-5 rounded-2xl border border-outline-variant">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-1 font-label-bold">Access Checklist</h3>
            <p className="text-sm font-semibold text-on-surface">
              {selectedEquipment.length > 0
                ? selectedEquipment.map(id => equipmentData.find(e => e.id === id)?.name).join(', ')
                : 'No equipment selected (Bodyweight only will be assumed)'}
            </p>
          </div>
          <button
            onClick={() => onSelect([])}
            disabled={selectedEquipment.length === 0}
            className="px-4 py-2 border border-outline-variant text-xs text-on-surface-variant hover:text-primary hover:border-primary/50 transition rounded-lg font-bold disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant font-label-bold"
          >
            Clear Checklist
          </button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentSelector;
