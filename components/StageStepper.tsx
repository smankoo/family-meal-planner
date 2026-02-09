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
      <div className="stage-stepper">
        {steps.map((step) => {
          const isActive = currentStage === step.id;
          // All tabs are clickable once a meal plan exists
          const isClickable = hasMealPlan;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && setStage(step.id)}
              disabled={!isClickable}
              className={`
                stage-stepper-tab
                ${isActive
                  ? 'stage-stepper-tab-active'
                  : isClickable
                    ? 'stage-stepper-tab-idle'
                    : 'stage-stepper-tab-disabled'}
              `}
            >
              <step.icon size={14} strokeWidth={2.5} />
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StageStepper;
