import React from 'react';
import { Stage } from '../types';
import { ChefHat, ShoppingBag, CalendarRange } from 'lucide-react';

interface StageStepperProps {
  currentStage: Stage;
  setStage: (stage: Stage) => void;
  hasMealPlan: boolean;
}

const StageStepper: React.FC<StageStepperProps> = ({ currentStage, setStage, hasMealPlan }) => {
  const steps = [
    { id: Stage.MEAL_PLANNING, label: 'Meals', icon: CalendarRange },
    { id: Stage.MEAL_PREP, label: 'Prep', icon: ChefHat },
    { id: Stage.GROCERY_LIST, label: 'Shop', icon: ShoppingBag },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="inline-flex bg-primary-100/80 p-1 rounded-full">
        {steps.map((step) => {
          const isActive = currentStage === step.id;
          // All stages are clickable if we have a meal plan
          // Meal planning is always clickable
          const isClickable = step.id === Stage.MEAL_PLANNING || hasMealPlan;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && setStage(step.id)}
              disabled={!isClickable}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-300
                ${isActive
                  ? 'bg-white text-primary-900 shadow-lg'
                  : isClickable
                    ? 'text-primary-500 hover:text-primary-700 hover:bg-white/50'
                    : 'text-primary-300 cursor-not-allowed'}
              `}
            >
              <step.icon size={14} strokeWidth={2.5} className={isActive ? 'text-primary-900' : 'currentColor'} />
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Progress Indicators */}
      <div className="flex gap-1.5">
        {steps.map((step) => {
          const isActive = currentStage === step.id;
          const isCompleted = hasMealPlan && step.id < currentStage;

          return (
            <div
              key={`indicator-${step.id}`}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${isActive
                  ? 'w-6 bg-accent-600'
                  : isCompleted
                  ? 'w-1.5 bg-[#10b981]'
                  : 'w-1.5 bg-primary-200'}
              `}
            />
          );
        })}
      </div>
    </div>
  );
};

export default StageStepper;
