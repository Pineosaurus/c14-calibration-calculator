import React from 'react';
import CategoryCard from './CategoryCard';

// Sample preset data - in a real implementation, this would likely come from props or context
const presets = [
  {
    id: 'neolithic',
    title: 'Neolithic Period',
    imageUrl: 'https://via.placeholder.com/300x200/1A2B3C/FFFFFF?text=Neolithic',
    age: 7000,
    uncertainty: 50
  },
  {
    id: 'bronze-age',
    title: 'Bronze Age',
    imageUrl: 'https://via.placeholder.com/300x200/2C3E50/FFFFFF?text=Bronze+Age',
    age: 4000,
    uncertainty: 40
  },
  {
    id: 'roman',
    title: 'Roman Era',
    imageUrl: 'https://via.placeholder.com/300x200/34495E/FFFFFF?text=Roman+Era',
    age: 2000,
    uncertainty: 30
  },
  {
    id: 'medieval',
    title: 'Medieval Period',
    imageUrl: 'https://via.placeholder.com/300x200/283747/FFFFFF?text=Medieval',
    age: 1000,
    uncertainty: 25
  }
];

const CalibrationPresets = ({ onSelectPreset }) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>Quick Start Presets</h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '20px', 
        marginTop: '15px'
      }}>
        {presets.map(preset => (
          <CategoryCard
            key={preset.id}
            title={preset.title}
            imageUrl={preset.imageUrl}
            onClick={() => onSelectPreset(preset)}
            style={{ height: '150px' }}
          />
        ))}
      </div>
    </div>
  );
};

export default CalibrationPresets;