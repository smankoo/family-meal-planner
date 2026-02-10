import React, { useState, useRef, useLayoutEffect } from 'react';
import { PrepTask, WeekPlan } from '../types';
import { Check, Clock, ArrowRight, Loader2 } from 'lucide-react';
import InvalidationBanner from './InvalidationBanner';
import RegenerateButton from './RegenerateButton';
import ProgressBar from './ProgressBar';
import { resolveMealName } from '../utils/mealResolver';

interface MealPrepViewProps {
  tasks: PrepTask[];
  mealPlan?: WeekPlan; // Add meal plan to resolve meal names
  onRegenerate: () => void;
  onGenerate: () => void;
  onNavigateToMealPlan: () => void;
  isLoading: boolean;
  hasMealPlan: boolean;
  newlyReceivedTasks?: Set<string>;
  isInvalidated?: boolean; // New prop to show invalidation banner
  onTasksChange?: (tasks: PrepTask[]) => void; // Callback to persist changes
  isLocked?: boolean;
}

const MealPrepView: React.FC<MealPrepViewProps> = ({
  tasks: initialTasks,
  mealPlan,
  onRegenerate,
  onGenerate,
  onNavigateToMealPlan,
  isLoading,
  hasMealPlan,
  newlyReceivedTasks = new Set(),
  isInvalidated = false,
  onTasksChange,
  isLocked = false,
}) => {
  const [tasks, setTasks] = useState<PrepTask[]>(initialTasks);

  // Use ref to track which tasks have already been animated
  const animatedTasksRef = useRef<Set<string>>(new Set());
  const taskRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Handle new tasks that should animate using direct DOM manipulation
  useLayoutEffect(() => {
    newlyReceivedTasks.forEach(taskKey => {
      if (!animatedTasksRef.current.has(taskKey)) {
        animatedTasksRef.current.add(taskKey);

        // Find the task element and animate it directly
        const taskElement = taskRefsRef.current.get(taskKey);
        if (taskElement) {
          // Remove any existing animation classes
          taskElement.classList.remove('animate-fade-in-up', 'animate-stream-in');

          // Force a reflow to ensure the class removal takes effect
          taskElement.offsetHeight;

          // Add the animation class
          taskElement.classList.add('animate-stream-in');

          // Remove the animation class after it completes to prevent re-triggering
          setTimeout(() => {
            taskElement.classList.remove('animate-stream-in');
          }, 600); // Match animation duration
        }
      }
    });
  }, [newlyReceivedTasks]);

  // Helper function to register task refs
  const registerTaskRef = (taskKey: string, element: HTMLDivElement | null) => {
    if (element) {
      taskRefsRef.current.set(taskKey, element);
    } else {
      taskRefsRef.current.delete(taskKey);
    }
  };

  const toggleTask = (id: string) => {
    if (isLocked) return;
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    // Propagate changes to parent for persistence
    if (onTasksChange) {
      onTasksChange(updatedTasks);
    }
  };

  // Skeleton component for loading states
  const TaskSkeleton: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => (
    <div className="card relative rounded-2xl p-5 min-h-[100px] flex gap-4">
      <div className="mt-1">
        <div className="w-5 h-5 rounded-full skeleton-shimmer"></div>
      </div>
      <div className="flex-1 space-y-2">
        <div className="w-3/4 h-5 skeleton-shimmer rounded"></div>
        <div className="w-full h-3 skeleton-shimmer rounded"></div>
        <div className="w-2/3 h-3 skeleton-shimmer rounded"></div>
        {isLoading && <Loader2 size={14} className="text-primary-300 animate-spin mt-2" />}
      </div>
    </div>
  );
  if (isLoading && tasks.length === 0) {
    return (
      <div className="animate-fade-in">
        {/* Header - Desktop Only */}
        <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-primary-900">Prep Strategy</h2>
        </div>

        {/* Skeleton Loading State */}
        <div className="md:hidden flex flex-col pb-20">
          <div className="mb-8">
            <div className="sticky-header-mobile">
              <h3 className="text-xl font-bold text-primary-900 tracking-tight">Weekend</h3>
            </div>
            <div className="space-y-3 px-4">
              <TaskSkeleton isLoading={true} />
              <TaskSkeleton isLoading={true} />
            </div>
          </div>
          <div className="mb-8">
            <div className="sticky-header-mobile">
              <h3 className="text-xl font-bold text-primary-900 tracking-tight">Sunday Night</h3>
            </div>
            <div className="space-y-3 px-4">
              <TaskSkeleton isLoading={true} />
            </div>
          </div>
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden md:block pb-20 max-w-4xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="label-section">Weekend</span>
              <div className="section-divider"></div>
            </div>
            <div className="space-y-3">
              <TaskSkeleton isLoading={true} />
              <TaskSkeleton isLoading={true} />
            </div>
          </div>
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="label-section">Sunday Night</span>
              <div className="section-divider"></div>
            </div>
            <div className="space-y-3">
              <TaskSkeleton isLoading={true} />
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2">
          <div className="loading-pill">
            <Clock size={16} className="text-primary-400 animate-pulse" />
            <span className="text-sm text-primary-600 font-medium">Designing your prep schedule...</span>
          </div>
        </div>
      </div>
    );
  }

  // Group by "Day"
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.day]) acc[task.day] = [];
    acc[task.day].push(task);
    return acc;
  }, {} as Record<string, PrepTask[]>);

  return (
    <div className="animate-fade-in">

      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 max-w-4xl mx-auto px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-primary-900">Prep Strategy</h2>
        {tasks.length > 0 && !isInvalidated && !isLocked && (
          <RegenerateButton onRegenerate={onRegenerate} isLoading={isLoading} showText={true} />
        )}
      </div>

      {/* Mobile: Regenerate Button - Subtle, top-right corner */}
      {tasks.length > 0 && !isInvalidated && !isLocked && (
        <div className="md:hidden flex justify-end mb-4 px-4">
          <RegenerateButton onRegenerate={onRegenerate} isLoading={isLoading} showText={false} />
        </div>
      )}

      {/* Progress Bar - Sticky below tab menu on mobile */}
      {tasks.length > 0 && (
        <div className="md:hidden sticky top-[62px] z-[15] px-4 pb-2 backdrop-blur-xl" style={{ backgroundColor: 'var(--surface-bg)' }}>
          <ProgressBar
            completed={tasks.filter(t => t.completed).length}
            total={tasks.length}
          />
        </div>
      )}

      {/* Progress Bar - Static on desktop */}
      {tasks.length > 0 && (
        <div className="hidden md:block max-w-4xl mx-auto px-4 md:px-8 mb-6">
          <ProgressBar
            completed={tasks.filter(t => t.completed).length}
            total={tasks.length}
          />
        </div>
      )}

      {/* Invalidation Banner */}
      {isInvalidated && tasks.length > 0 && (
        <div className="px-4 md:px-8 max-w-4xl mx-auto mb-0 md:mb-6">
          <InvalidationBanner
            type="prep"
            onRegenerate={onRegenerate}
            isLoading={isLoading}
            className="animate-fade-in"
          />
        </div>
      )}

      {tasks.length === 0 && !isLoading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center px-4">
          <div className="empty-state-icon-wrapper">
            <Clock size={32} className="text-primary-400" />
          </div>

          {!hasMealPlan ? (
            <>
              <h3 className="empty-state-heading">Create Your Meal Plan First</h3>
              <p className="empty-state-text">
                A prep strategy is based on your weekly meal plan. Start by creating your meals for the week.
              </p>
              <button
                onClick={onNavigateToMealPlan}
                className="btn-empty-state"
              >
                <ArrowRight size={16} />
                Go to Meal Planning
              </button>
            </>
          ) : (
            <>
              <h3 className="empty-state-heading">No Prep Strategy Yet</h3>
              <p className="empty-state-text">
                Generate a personalized prep strategy to make your week easier and more organized.
              </p>
              <button
                onClick={onGenerate}
                disabled={isLoading}
                className="btn-empty-state"
              >
                <Clock size={16} />
                Generate Prep Strategy
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="md:hidden flex flex-col pb-20 px-4">
          {Object.entries(groupedTasks).map(([day, dayTasks]) => (
            <div key={day} className="mb-8">

              {/* Sticky Day Header - Apple-style section header */}
              <div className="sticky-header-mobile sticky-header-with-progress">
                <h3 className="text-xl font-bold text-primary-900 tracking-tight">
                  {day}
                </h3>
              </div>

              {/* Tasks for that day */}
              <div className="space-y-3">
                {dayTasks.map((task, taskIdx) => {
                  const taskKey = `${task.day}-${task.id}`;
                  return (
                  <div
                    key={task.id}
                    ref={(el) => registerTaskRef(taskKey, el)}
                    onClick={() => toggleTask(task.id)}
                    className={`
                      stagger-item relative rounded-2xl p-5 shadow-sm border transition-all active:scale-[0.98] ${isLocked ? 'cursor-default' : 'cursor-pointer'}
                      ${task.completed ? 'border-emerald-200/50' : 'border-primary-100'}
                    `}
                    style={{ animationDelay: `${taskIdx * 50}ms`, backgroundColor: 'var(--surface-primary)' }}
                  >
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <div className={`
                          checkbox-enhanced
                          ${task.completed ? 'checkbox-checked' : 'checkbox-unchecked'}
                          ${isLocked ? 'opacity-60' : ''}
                        `}>
                          {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-lg font-semibold mb-1 leading-snug transition-all duration-300 ${task.completed ? 'text-primary-400 line-through decoration-emerald-400' : 'text-primary-900'}`}>
                          {task.task}
                        </p>

                        {task.relatedMeals && Array.isArray(task.relatedMeals) && task.relatedMeals.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {task.relatedMeals.map((meal, idx) => {
                              const resolvedMealName = resolveMealName(meal, mealPlan);
                              return (
                                <span key={idx} className={task.completed ? 'related-meal-pill-checked' : 'related-meal-pill'}>
                                  <ArrowRight size={10} className="text-primary-400" />
                                  <span className={`text-[10px] font-medium ${task.completed ? 'text-primary-400' : 'text-primary-500'}`}>{resolvedMealName}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop View - Consistent with mobile styling */}
      <div className="hidden md:block pb-20">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          {Object.entries(groupedTasks).map(([day, dayTasks]) => (
            <div key={day} className="mb-8">

              {/* Day Header - Sticky with backdrop blur */}
              <div className="sticky-header-mobile">
                <div className="flex items-center gap-4">
                  <span className="label-section">{day}</span>
                </div>
              </div>

              {/* Tasks for that day - Same card style as mobile */}
              <div className="space-y-3">
                {dayTasks.map((task, taskIdx) => {
                const taskKey = `${task.day}-${task.id}`;
                return (
                <div
                  key={task.id}
                  ref={(el) => registerTaskRef(taskKey, el)}
                  onClick={() => toggleTask(task.id)}
                  className={`
                    stagger-item relative rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${isLocked ? 'cursor-default' : 'cursor-pointer'}
                    ${task.completed ? 'border-emerald-200/50' : 'border-primary-100'}
                  `}
                  style={{ animationDelay: `${taskIdx * 50}ms`, backgroundColor: 'var(--surface-primary)' }}
                >
                  <div className="flex gap-4">
                    <div className="mt-1">
                      <div className={`
                        checkbox-enhanced
                        ${task.completed ? 'checkbox-checked' : 'checkbox-unchecked'}
                        ${isLocked ? 'opacity-60' : ''}
                      `}>
                        {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-lg font-semibold mb-1 leading-snug transition-all duration-300 ${task.completed ? 'text-primary-400 line-through decoration-emerald-400' : 'text-primary-900'}`}>
                        {task.task}
                      </p>

                      {task.relatedMeals && Array.isArray(task.relatedMeals) && task.relatedMeals.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {task.relatedMeals.map((meal, idx) => {
                            const resolvedMealName = resolveMealName(meal, mealPlan);
                            return (
                              <span key={idx} className={task.completed ? 'related-meal-pill-checked' : 'related-meal-pill'}>
                                <ArrowRight size={10} className="text-primary-400" />
                                <span className={`text-[10px] font-medium ${task.completed ? 'text-primary-400' : 'text-primary-500'}`}>{resolvedMealName}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default MealPrepView;
