
import React, { useState } from 'react';

const options = [
  { value: 'topology', label: 'Topología' },
  { value: 'switches', label: 'Switches' },
  { value: 'access_points', label: 'Access Points' },
  { value: 'appliance_status', label: 'Appliance Status' }
];

export default function Selector({ onSelect, predio }) {
  const [section, setSection] = useState(options[0].value);

  const handleSubmit = e => {
    e.preventDefault();
    onSelect(section);
  };

  return (
    <div className="selector-container">
      <h2>Selecciona la sección</h2>
      {predio && (
        <div style={{ color: '#4a90e2', fontWeight: 500, marginBottom: 10, fontSize: '1.05rem' }}>
          Predio: <span style={{ fontWeight: 700 }}>{predio}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <select value={section} onChange={e => setSection(e.target.value)}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="submit">Siguiente</button>
      </form>
    </div>
  );
}
