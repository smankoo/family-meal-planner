import React, { useState } from 'react';
import { WeekPlan, MealTime } from '../types';
import { Users, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

interface MealGridProps {
  plan: WeekPlan;
  previousPlan?: WeekPlan;
  onCellClick?: (day: string, time: MealTime) => void;
}

const MealGrid: React.FC<MealGridProps> = ({ plan, previousPlan, onCellClick }) => {
  const mealTimes = [MealTime.BREAKFAST, MealTime.LUNCH, MealTime.SNACK, MealTime.DINNER];
  
  const hasChanged = (dayIndex: number, time: MealTime): boolean => {
    if (!previousPlan) return false;
    const currentName = plan[dayIndex].meals[time].name;
    const prevName = previousPlan[dayIndex]?.meals[time]?.name;
    return currentName !== prevName && currentName !== '';
  };

  // --- Mobile View (Apple-style sticky section headers) ---
  const MobileView = () => {
    return (
      <div className="md:hidden flex flex-col pb-20">
        {plan.map((dayPlan, dayIdx) => (
            <div key={dayPlan.day} className="mb-8">
                
                {/* Sticky Day Header - Apple-style section header */}
                <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
                    <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                        {dayPlan.day}
                    </h3>
                </div>

                {/* Cards for that day */}
                <div className="space-y-3 px-4">
                    {mealTimes.map((time) => {
                        const cell = dayPlan.meals[time];
                        const isChanged = hasChanged(dayIdx, time);

                        return (
                             <div 
                                key={time}
                                onClick={() => onCellClick && onCellClick(dayPlan.day, time)}
                                className={`
                                  relative bg-white rounded-2xl p-5 shadow-sm border transition-all active:scale-[0.98]
                                  ${isChanged 
                                    ? 'border-indigo-100 bg-indigo-50/20' 
                                    : 'border-zinc-100'}
                                `}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{time}</span>
                                  {isChanged && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}
                                </div>
                                
                                <h4 className={`text-lg font-semibold mb-1 leading-snug ${!cell.name ? 'text-zinc-300 italic' : 'text-zinc-800'}`}>
                                  {cell.name || "Nothing planned"}
                                </h4>
                                
                                {cell.description && (
                                  <p className="text-sm text-zinc-500 leading-relaxed font-light line-clamp-2">
                                    {cell.description}
                                  </p>
                                )}

                                {cell.notes && (
                                  <div className="mt-3 inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-lg">
                                    <Users size={12} className="text-zinc-400" />
                                    <span className="text-[10px] font-medium text-zinc-500">{cell.notes}</span>
                                  </div>
                                )}
                              </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    );
  };

  // --- Adaptive Desktop View (Apple-like fluid responsive) ---
  const DesktopView = () => {
    return (
      <div className="hidden md:flex flex-col gap-10">
        
        {/* Render each MealTime as a Row */}
        {mealTimes.map((time) => (
            <div key={time} className="w-full">
                {/* Row Header */}
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{time}</span>
                    <div className="h-[1px] flex-1 bg-zinc-100"></div>
                </div>
                
                {/* Adaptive Grid - Apple-like responsive behavior */}
                <div className="grid gap-4 
                    grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7
                    2xl:grid-cols-7">
                    {plan.map((dayPlan, dayIdx) => {
                        const cell = dayPlan.meals[time];
                        const isChanged = hasChanged(dayIdx, time);

                        return (
                            <div
                                key={`${dayPlan.day}-${time}`}
                                onClick={() => onCellClick && onCellClick(dayPlan.day, time)}
                                className={`
                                    relative p-4 xl:p-5 bg-white rounded-2xl border transition-all duration-300 group
                                    flex flex-col h-full min-h-[140px] xl:min-h-[160px] 
                                    hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/50 cursor-default
                                    ${isChanged 
                                        ? 'border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white' 
                                        : 'border-zinc-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]'}
                                `}
                            >
                                {/* Day Label inside card for context */}
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                                        {dayPlan.day.slice(0, 3)}
                                    </span>
                                    {isChanged && <Sparkles size={14} className="text-indigo-400" />}
                                </div>

                                <div className="flex-1">
                                    <h4 className={`font-bold text-sm xl:text-sm leading-snug mb-2 ${!cell.name ? 'text-zinc-300 italic' : 'text-zinc-800'}`}>
                                        {cell.name || "—"}
                                    </h4>
                                    {cell.description && (
                                        <p className="text-xs text-zinc-500 font-light leading-relaxed line-clamp-2 xl:line-clamp-3">
                                            {cell.description}
                                        </p>
                                    )}
                                </div>

                                {cell.notes && (
                                    <div className="mt-3 pt-3 border-t border-zinc-50">
                                        <div className="flex items-start gap-1.5">
                                            <Users size={12} className="text-zinc-300 mt-0.5 shrink-0" />
                                            <span className="text-[10px] font-semibold text-zinc-400 leading-tight">
                                                {cell.notes}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <MobileView />
      <DesktopView />
    </div>
  );
};

export default MealGrid;