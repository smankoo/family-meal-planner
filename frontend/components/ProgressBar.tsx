import React from 'react';

interface ProgressBarProps {
  completed: number;
  total: number;
  className?: string;
  variant?: 'default' | 'amber';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  completed,
  total,
  className = '',
  variant = 'default'
}) => {
  if (total === 0) return null;

  const percentage = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="progress-bar-container flex-1">
        <div
          className={`progress-bar-fill ${variant === 'amber' ? 'progress-bar-fill-amber' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums min-w-[3rem] text-right ${
        isComplete ? 'text-emerald-500' : 'text-primary-400'
      }`}>
        {completed}/{total}
      </span>
    </div>
  );
};

export default ProgressBar;
