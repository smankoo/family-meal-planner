import React from 'react';
import { PrepTask } from '../types';
import { Circle, Clock, ArrowRight, Sparkles } from 'lucide-react';

interface MealPrepViewProps {
  tasks: PrepTask[];
  onRegenerate: () => void;
  isLoading: boolean;
}

const MealPrepView: React.FC<MealPrepViewProps> = ({ tasks, onRegenerate, isLoading }) => {
  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
        <div className="animate-pulse flex flex-col items-center">
            <Clock size={48} strokeWidth={1} className="mb-4 text-zinc-300" />
            <p className="text-zinc-400 font-medium">Designing your prep schedule...</p>
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
        <div className="flex gap-3">
          <button 
            onClick={onRegenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            <Sparkles size={12} className="md:w-[14px] md:h-[14px]" /> Regenerate
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex justify-end items-center mb-6 px-4">
        <button 
          onClick={onRegenerate}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-500 rounded-full text-xs font-medium hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
        >
          <Sparkles size={12} /> Regenerate
        </button>
      </div>

      {tasks.length === 0 && !isLoading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center">
          <Clock className="animate-bounce mb-4 text-zinc-300" size={48} />
          <p className="text-zinc-400 font-medium">No prep plan generated yet.</p>
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
                {dayTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="relative bg-white rounded-2xl p-5 shadow-sm border border-zinc-100"
                  >
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <Circle size={20} strokeWidth={1.5} className="text-zinc-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold mb-1 leading-snug text-zinc-800">
                          {task.task}
                        </p>
                        
                        {task.relatedMeals && task.relatedMeals.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {task.relatedMeals.map((meal, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-lg">
                                <ArrowRight size={10} className="text-zinc-400" />
                                <span className="text-[10px] font-medium text-zinc-500">{meal}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
              {dayTasks.map((task) => (
                <div 
                  key={task.id}
                  className="relative bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <div className="mt-1">
                      <Circle size={20} strokeWidth={1.5} className="text-zinc-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold mb-1 leading-snug text-zinc-800">
                        {task.task}
                      </p>
                      
                      {task.relatedMeals && task.relatedMeals.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {task.relatedMeals.map((meal, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-lg">
                              <ArrowRight size={10} className="text-zinc-400" />
                              <span className="text-[10px] font-medium text-zinc-500">{meal}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealPrepView;