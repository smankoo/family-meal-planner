import React, { useState, useRef, useLayoutEffect } from 'react';
import { PrepTask, WeekPlan } from '../types';
import { Check, Clock, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';

interface MealPrepViewProps {
  tasks: PrepTask[];
  mealPlan?: WeekPlan; // Add meal plan to resolve meal names
  onRegenerate: () => void;
  onGenerate: () => void;
  onNavigateToMealPlan: () => void;
  isLoading: boolean;
  hasMealPlan: boolean;
  newlyReceivedTasks?: Set<string>;
}

const MealPrepView: React.FC<MealPrepViewProps> = ({
  tasks: initialTasks,
  mealPlan,
  onRegenerate,
  onGenerate,
  onNavigateToMealPlan,
  isLoading,
  hasMealPlan,
  newlyReceivedTasks = new Set()
}) => {
  const [tasks, setTasks] = useState<PrepTask[]>(initialTasks);

  // Use ref to track which tasks have already been animated
  const animatedTasksRef = useRef<Set<string>>(new Set());
  const taskRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Helper function to resolve meal names from generic references
  const resolveMealName = (mealRef: string): string => {
    if (!mealPlan) return mealRef;

    // Try to parse references like "monday dinner", "Tuesday Lunch", etc.
    const parts = mealRef.toLowerCase().split(' ');
    if (parts.length >= 2) {
      const dayPart = parts[0];
      const mealPart = parts[1];

      // Find the day in the meal plan
      const dayPlan = mealPlan.find(day =>
        day.day.toLowerCase().startsWith(dayPart) ||
        day.day.toLowerCase() === dayPart
      );

      if (dayPlan) {
        // Find the meal type
        const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
        const mealType = mealTypes.find(type =>
          type.startsWith(mealPart) || mealPart.startsWith(type)
        );

        if (mealType) {
          const mealKey = mealType.charAt(0).toUpperCase() + mealType.slice(1);
          const meal = dayPlan.meals[mealKey as keyof typeof dayPlan.meals];
          if (meal && meal.name && meal.name.trim()) {
            return meal.name;
          }
        }
      }
    }

    // If we can't resolve it, return the original reference
    return mealRef;
  };

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
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  // Skeleton component for loading states
  const TaskSkeleton: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => (
    <div className={`
      relative bg-white rounded-2xl p-5 shadow-sm border border-zinc-100
      min-h-[100px] flex gap-4
      ${isLoading ? 'animate-pulse' : ''}
    `}>
      <div className="mt-1">
        <div className="w-5 h-5 rounded-full bg-zinc-200"></div>
      </div>
      <div className="flex-1">
        <div className="w-3/4 h-5 bg-zinc-200 rounded mb-2"></div>
        <div className="w-full h-3 bg-zinc-100 rounded mb-1"></div>
        <div className="w-2/3 h-3 bg-zinc-100 rounded"></div>
        {isLoading && <Loader2 size={14} className="text-zinc-300 animate-spin mt-2" />}
      </div>
    </div>
  );
  if (isLoading && tasks.length === 0) {
    return (
      <div className="animate-fade-in">
        {/* Header - Desktop Only */}
        <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Prep Strategy</h2>
        </div>

        {/* Skeleton Loading State */}
        <div className="md:hidden flex flex-col pb-20">
          <div className="mb-8">
            <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Weekend</h3>
            </div>
            <div className="space-y-3 px-4">
              <TaskSkeleton isLoading={true} />
              <TaskSkeleton isLoading={true} />
            </div>
          </div>
          <div className="mb-8">
            <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Sunday Night</h3>
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
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Weekend</span>
              <div className="h-[1px] flex-1 bg-zinc-100"></div>
            </div>
            <div className="space-y-3">
              <TaskSkeleton isLoading={true} />
              <TaskSkeleton isLoading={true} />
            </div>
          </div>
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Sunday Night</span>
              <div className="h-[1px] flex-1 bg-zinc-100"></div>
            </div>
            <div className="space-y-3">
              <TaskSkeleton isLoading={true} />
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-zinc-200">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-zinc-400 animate-pulse" />
            <span className="text-sm text-zinc-600 font-medium">Designing your prep schedule...</span>
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
      <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 max-w-4xl mx-auto px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Prep Strategy</h2>
        {tasks.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              <RotateCcw size={12} className="md:w-[14px] md:h-[14px]" /> Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Mobile Header - Include regenerate button for mobile users only when tasks exist */}
      {tasks.length > 0 && (
        <div className="md:hidden mb-6 px-4">
          <div className="flex justify-end">
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} /> Regenerate
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 && !isLoading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
            <Clock size={24} className="text-zinc-400" />
          </div>

          {!hasMealPlan ? (
            <>
              <h3 className="text-lg font-semibold text-zinc-800 mb-2">Create Your Meal Plan First</h3>
              <p className="text-zinc-500 text-center mb-6 max-w-sm leading-relaxed">
                A prep strategy is based on your weekly meal plan. Start by creating your meals for the week.
              </p>
              <button
                onClick={onNavigateToMealPlan}
                className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-zinc-800 transition-colors"
              >
                <ArrowRight size={16} />
                Go to Meal Planning
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-zinc-800 mb-2">No Prep Strategy Yet</h3>
              <p className="text-zinc-500 text-center mb-6 max-w-sm leading-relaxed">
                Generate a personalized prep strategy to make your week easier and more organized.
              </p>
              <button
                onClick={onGenerate}
                disabled={isLoading}
                className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <Clock size={16} />
                Generate Prep Strategy
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="md:hidden flex flex-col pb-20">
          {Object.entries(groupedTasks).map(([day, dayTasks]) => (
            <div key={day} className="mb-8">

              {/* Sticky Day Header - Apple-style section header */}
              <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {day}
                </h3>
              </div>

              {/* Tasks for that day */}
              <div className="space-y-3 px-4">
                {dayTasks.map((task) => {
                  const taskKey = `${task.day}-${task.id}`;
                  return (
                  <div
                    key={task.id}
                    ref={(el) => registerTaskRef(taskKey, el)}
                    onClick={() => toggleTask(task.id)}
                    className={`
                      relative bg-white rounded-2xl p-5 shadow-sm border transition-all active:scale-[0.98] cursor-pointer
                      ${task.completed ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-100'}
                    `}
                  >
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <div className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                          ${task.completed
                              ? 'bg-zinc-400 border-zinc-400'
                              : 'bg-transparent border-zinc-300'}
                        `}>
                          {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-lg font-semibold mb-1 leading-snug transition-colors ${task.completed ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                          {task.task}
                        </p>

                        {task.relatedMeals && Array.isArray(task.relatedMeals) && task.relatedMeals.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {task.relatedMeals.map((meal, idx) => {
                              const resolvedMealName = resolveMealName(meal);
                              return (
                                <span key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${task.completed ? 'bg-zinc-50 border-zinc-100 text-zinc-400' : 'bg-zinc-50 border-zinc-100'}`}>
                                  <ArrowRight size={10} className="text-zinc-400" />
                                  <span className={`text-[10px] font-medium ${task.completed ? 'text-zinc-400' : 'text-zinc-500'}`}>{resolvedMealName}</span>
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
        {Object.entries(groupedTasks).map(([day, dayTasks]) => (
          <div key={day} className="mb-8">

            {/* Day Header - Aligned with content */}
            <div className="flex items-center gap-4 mb-4 max-w-4xl mx-auto px-4 md:px-8">
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{day}</span>
              <div className="h-[1px] flex-1 bg-zinc-100"></div>
            </div>

            {/* Tasks for that day - Same card style as mobile */}
            <div className="space-y-3 px-4 md:px-8 max-w-4xl mx-auto">
              {dayTasks.map((task) => {
                const taskKey = `${task.day}-${task.id}`;
                return (
                <div
                  key={task.id}
                  ref={(el) => registerTaskRef(taskKey, el)}
                  onClick={() => toggleTask(task.id)}
                  className={`
                    relative bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md cursor-pointer
                    ${task.completed ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-100'}
                  `}
                >
                  <div className="flex gap-4">
                    <div className="mt-1">
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                        ${task.completed
                            ? 'bg-zinc-400 border-zinc-400'
                            : 'bg-transparent border-zinc-300 hover:border-zinc-400'}
                      `}>
                        {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-lg font-semibold mb-1 leading-snug transition-colors ${task.completed ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                        {task.task}
                      </p>

                      {task.relatedMeals && Array.isArray(task.relatedMeals) && task.relatedMeals.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {task.relatedMeals.map((meal, idx) => {
                            const resolvedMealName = resolveMealName(meal);
                            return (
                              <span key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${task.completed ? 'bg-zinc-50 border-zinc-100 text-zinc-400' : 'bg-zinc-50 border-zinc-100'}`}>
                                <ArrowRight size={10} className="text-zinc-400" />
                                <span className={`text-[10px] font-medium ${task.completed ? 'text-zinc-400' : 'text-zinc-500'}`}>{resolvedMealName}</span>
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
  );
};

export default MealPrepView;
