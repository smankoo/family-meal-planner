import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, CaretUpDown, Check, MagnifyingGlass } from '@phosphor-icons/react';

const CUISINE_OPTIONS = [
  'Italian', 'Mediterranean', 'Mexican', 'Thai', 'Chinese',
  'Japanese', 'Indian', 'Korean', 'Vietnamese', 'French',
  'Greek', 'Spanish', 'Middle Eastern', 'Moroccan', 'Ethiopian',
  'American', 'Southern (US)', 'Cajun/Creole', 'Caribbean', 'Brazilian',
  'Peruvian', 'Turkish', 'Lebanese', 'Indonesian', 'Malaysian',
  'Filipino', 'German', 'British', 'Scandinavian', 'Eastern European',
  'Soul Food', 'Tex-Mex', 'Hawaiian', 'Fusion',
];

interface CuisineMultiSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CuisineMultiSelect: React.FC<CuisineMultiSelectProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => {
    if (!value || !value.trim()) return [] as string[];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return CUISINE_OPTIONS;
    const q = search.toLowerCase();
    return CUISINE_OPTIONS.filter(c => c.toLowerCase().includes(q));
  }, [search]);

  const toggleCuisine = (cuisine: string) => {
    const next = selected.includes(cuisine)
      ? selected.filter(c => c !== cuisine)
      : [...selected, cuisine];
    onChange(next.join(', '));
  };

  const removeCuisine = (cuisine: string) => {
    onChange(selected.filter(c => c !== cuisine).join(', '));
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <div className="relative space-y-3" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="cuisine-select-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select cuisines"
      >
        <span className={selected.length > 0 ? 'cuisine-select-count' : 'cuisine-select-placeholder'}>
          {selected.length === 0
            ? 'Search and select cuisines...'
            : `${selected.length} cuisine${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <CaretUpDown size={18} weight="bold" className="cuisine-select-caret" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="cuisine-select-dropdown">
          {/* Search */}
          <div className="cuisine-select-search">
            <MagnifyingGlass size={16} weight="bold" className="cuisine-select-search-icon" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cuisine-select-search-input"
              placeholder="Type to search..."
            />
          </div>

          {/* Options */}
          <div className="cuisine-select-list" role="listbox" aria-multiselectable="true">
            {filtered.length === 0 ? (
              <div className="cuisine-select-empty">No cuisines found.</div>
            ) : (
              filtered.map((cuisine) => {
                const isSelected = selected.includes(cuisine);
                return (
                  <button
                    key={cuisine}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleCuisine(cuisine)}
                    className={`cuisine-select-item ${isSelected ? 'cuisine-select-item-active' : ''}`}
                  >
                    <span className={`cuisine-select-check ${isSelected ? 'cuisine-select-check-active' : ''}`}>
                      {isSelected && <Check size={10} weight="bold" />}
                    </span>
                    {cuisine}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="cuisine-chips-container">
          {selected.map((cuisine) => (
            <span key={cuisine} className="cuisine-chip">
              {cuisine}
              <button
                type="button"
                onClick={() => removeCuisine(cuisine)}
                className="cuisine-chip-remove"
                aria-label={`Remove ${cuisine}`}
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CuisineMultiSelect;
