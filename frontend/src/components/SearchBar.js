import React from 'react';
import '../styles/SearchBar.css';

function SearchBar({ value, onChange, placeholder = "Buscar...", onClear }) {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {value && (
          <button
            className="search-clear"
            onClick={() => {
              onChange('');
              if (onClear) onClear();
            }}
            type="button"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;

