import React from 'react';
import { WeekPlan, MealTime } from '../types';
import { MEAL_TIMES } from '../constants';

interface PrintableMealPlanProps {
  plan: WeekPlan;
}

/**
 * Print-only component: renders the weekly meal plan as a compact table
 * optimized to fit on a single US Letter sheet (8.5" x 11").
 * Hidden on screen, visible only via @media print rules in index.css.
 */
const PrintableMealPlan: React.FC<PrintableMealPlanProps> = ({ plan }) => {
  const mealTimeLabels: Record<MealTime, string> = {
    [MealTime.BREAKFAST]: 'Breakfast',
    [MealTime.LUNCH]: 'Lunch',
    [MealTime.SNACK]: 'Snack',
    [MealTime.DINNER]: 'Dinner',
  };

  return (
    <div className="print-container">
      <h1 className="print-title">Weekly Meal Plan</h1>
      <table className="print-table">
        <thead>
          <tr>
            <th className="print-th print-th-day">Day</th>
            {MEAL_TIMES.map((time) => (
              <th key={time} className="print-th">
                {mealTimeLabels[time]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.map((dayPlan) => (
            <tr key={dayPlan.day} className="print-row">
              <td className="print-td print-td-day">{dayPlan.day}</td>
              {MEAL_TIMES.map((time) => {
                const meal = dayPlan.meals[time];
                const hasContent = meal?.name && meal.name.trim() !== '';
                return (
                  <td key={time} className="print-td">
                    {hasContent ? (
                      <>
                        <span className="print-meal-name">{meal.name}</span>
                        {meal.description && (
                          <span className="print-meal-desc">{meal.description}</span>
                        )}
                      </>
                    ) : (
                      <span className="print-meal-empty">&mdash;</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PrintableMealPlan;
