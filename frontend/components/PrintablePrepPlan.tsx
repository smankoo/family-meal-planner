import React from 'react';
import { PrepTask } from '../types';

interface PrintablePrepPlanProps {
  tasks: PrepTask[];
  filterLabel?: string;
}

/**
 * Print-only component: renders the prep plan grouped by day
 * as a compact checklist optimized for US Letter (8.5" x 11").
 * Hidden on screen, visible only via @media print rules in index.css.
 */
const PrintablePrepPlan: React.FC<PrintablePrepPlanProps> = ({ tasks, filterLabel }) => {
  const grouped = tasks.reduce((acc, task) => {
    if (!acc[task.day]) acc[task.day] = [];
    acc[task.day].push(task);
    return acc;
  }, {} as Record<string, PrepTask[]>);

  return (
    <div className="print-container">
      <h1 className="print-title">Prep Strategy</h1>
      {filterLabel && <p className="print-subtitle">{filterLabel}</p>}
      {Object.entries(grouped).map(([day, dayTasks]) => (
        <div key={day} className="print-prep-day">
          <h2 className="print-prep-day-title">{day}</h2>
          <ul className="print-prep-tasks">
            {dayTasks.map((task) => (
              <li key={task.id} className="print-prep-task">
                <span className={`print-prep-checkbox ${task.completed ? 'print-prep-checkbox-checked' : ''}`} />
                <span className={`print-prep-task-text ${task.completed ? 'print-prep-task-checked' : ''}`}>
                  {task.task}
                </span>
                {task.relatedMeals && task.relatedMeals.length > 0 && (
                  <span className="print-prep-meals">
                    ({task.relatedMeals.join(', ')})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default PrintablePrepPlan;
