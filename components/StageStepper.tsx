import React from 'react';
import { Stage } from '../types';
import { ChefHat, ShoppingBag, CalendarRange } from 'lucide-react';

interface StageStepperProps {
  currentStage: Stage;
  setStage: (stage: Stage) => void;
  maxStageReached: Stage;
}

const StageStepper: React.FC<StageStepperProps> = ({ currentStage, setStage, maxStageReached }) => {
  const steps = [
    { id: Stage.MEAL_PLANNING, label: 'Meals', icon: CalendarRange },
    { id: Stage.MEAL_PREP, label: 'Prep', icon: ChefHat },
    { id: Stage.GROCERY_LIST, label: 'Shop', icon: ShoppingBag },
  ];

  return (
    <div className="inline-flex bg-zinc-100/80 p-1 rounded-full">
        {steps.map((step) => {
          const isActive = currentStage === step.id;
          const isClickable = maxStageReached >= step.id;
          
          return (
            <button
              key={step.id}
              onClick={() => isClickable && setStage(step.id)}
              disabled={!isClickable}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-300
                ${isActive 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : isClickable 
                    ? 'text-zinc-500 hover:text-zinc-700' 
                    : 'text-zinc-300 cursor-not-allowed'}
              `}
            >
              <step.icon size={14} strokeWidth={2.5} className={isActive ? 'text-zinc-900' : 'currentColor'} />
              <span>{step.label}</span>
            </button>
          );
        })}
    </div>
  );
};

export default StageStepper;