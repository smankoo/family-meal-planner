import React from 'react';

export type FilterMode = 'incomplete' | 'complete' | 'all';

interface CompletionFilterProps {
  value: FilterMode;
  onChange: (mode: FilterMode) => void;
}

const options: { label: string; value: FilterMode }[] = [
  { label: 'To Do', value: 'incomplete' },
  { label: 'Done', value: 'complete' },
  { label: 'All', value: 'all' },
];

const CompletionFilter: React.FC<CompletionFilterProps> = ({ value, onChange }) => (
  <div className="completion-filter" role="tablist" aria-label="Filter by completion">
    {options.map((opt) => (
      <button
        key={opt.value}
        role="tab"
        aria-selected={value === opt.value}
        className={`completion-filter-tab ${
          value === opt.value ? 'completion-filter-tab-active' : 'completion-filter-tab-idle'
        }`}
        onClick={() => onChange(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default CompletionFilter;
