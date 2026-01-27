import React from 'react';
import { PrepTask } from '../types';
import { Circle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

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
            <Clock size={48} strokeWidth={1} className="mb-4 text-indigo-300" />
            <p className="text-lg font-light">Designing your prep schedule...</p>
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
    <div className="max-w-3xl mx-auto pt-24 pb-12 px-4 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Prep Strategy</h2>
          <p className="text-zinc-500 mt-2 font-light">Work smarter, not harder.</p>
        </div>
        <button 
          onClick={onRegenerate}
          disabled={isLoading}
          className="px-4 py-2 rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
        >
          {isLoading ? 'Thinking...' : 'Refresh Strategy'}
        </button>
      </div>

      {tasks.length === 0 && !isLoading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-zinc-100 shadow-sm">
          <p className="text-zinc-400 font-light mb-6">No prep plan generated yet.</p>
          <button 
             onClick={onRegenerate}
             className="px-8 py-3 bg-zinc-900 text-white rounded-full font-semibold hover:bg-black transition-all"
          >
            Generate Plan
          </button>
        </div>
      ) : (
          <div className="grid grid-cols-1 gap-8">
            {Object.entries(groupedTasks).map(([day, dayTasks]) => (
            <div key={day} className="relative">
                <div className="sticky top-20 z-10 inline-block mb-4">
                     <span className="bg-zinc-900 text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-lg">
                        {day}
                     </span>
                </div>
                
                <div className="bg-white rounded-3xl p-2 shadow-sm border border-zinc-100/50">
                {dayTasks.map(task => (
                    <div key={task.id} className="p-5 flex gap-5 hover:bg-zinc-50 rounded-2xl transition-colors group cursor-default">
                    <div className="mt-1">
                        <Circle size={24} strokeWidth={1.5} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div className="flex-1">
                        <p className="text-lg text-zinc-800 font-medium leading-relaxed">{task.task}</p>
                        {task.relatedMeals && task.relatedMeals.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {task.relatedMeals.map((meal, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                                <ArrowRight size={10} /> {meal}
                            </span>
                            ))}
                        </div>
                        )}
                    </div>
                    </div>
                ))}
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MealPrepView;