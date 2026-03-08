import React from 'react';
import { Lock, Unlock } from 'lucide-react';

interface PlanLockToggleProps {
  isLocked: boolean;
  onToggle: () => void;
}

const PlanLockToggle: React.FC<PlanLockToggleProps> = ({
  isLocked,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className={`
        plan-lock-slider
        ${isLocked ? 'plan-lock-slider-locked' : 'plan-lock-slider-unlocked'}
      `}
      title={isLocked ? 'Unlock plan to allow changes' : 'Lock plan to prevent changes'}
      aria-label={isLocked ? 'Unlock plan' : 'Lock plan'}
      aria-checked={isLocked}
      role="switch"
    >
      <span className="plan-lock-slider-thumb">
        {isLocked ? (
          <Lock size={10} strokeWidth={2.5} />
        ) : (
          <Unlock size={10} strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
};

export default PlanLockToggle;
