import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { WeekPlan, MealTime } from '../types';
import { Users, Sparkles, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

interface MealGridProps {
  plan: WeekPlan;
  previousPlan?: WeekPlan;
  onCellClick?: (day: string, time: MealTime) => void;
  isStreaming?: boolean;
  newlyReceivedCards?: Set<string>;
}

const MealGrid: React.FC<MealGridProps> = ({
  plan,
  previousPlan,
  onCellClick,
  isStreaming = false,
  newlyReceivedCards = new Set()
}) => {
  const mealTimes = [MealTime.BREAKFAST, MealTime.LUNCH, MealTime.SNACK, MealTime.DINNER];

  // Use ref to track which cards have already been animated to prevent re-animation
  const animatedCardsRef = useRef<Set<string>>(new Set());
  const cardRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Reset animated cards when starting a new plan generation
  useEffect(() => {
    if (isStreaming && plan.every(day =>
      Object.values(day.meals).every(meal => !meal.name || meal.name.trim() === '')
    )) {
      // This is a fresh plan generation, reset animated cards
      animatedCardsRef.current = new Set();
      cardRefsRef.current.clear();
    }
  }, [isStreaming, plan]);

  // Handle new cards that should animate using direct DOM manipulation
  useLayoutEffect(() => {
    newlyReceivedCards.forEach(cardKey => {
      if (!animatedCardsRef.current.has(cardKey)) {
        animatedCardsRef.current.add(cardKey);

        // Find the card element and animate it directly
        const cardElement = cardRefsRef.current.get(cardKey);
        if (cardElement) {
          // Remove any existing animation classes
          cardElement.classList.remove('animate-fade-in-up', 'animate-stream-in');

          // Force a reflow to ensure the class removal takes effect
          cardElement.offsetHeight;

          // Add the animation class
          cardElement.classList.add('animate-stream-in');

          // Remove the animation class after it completes to prevent re-triggering
          setTimeout(() => {
            cardElement.classList.remove('animate-stream-in');
          }, 600); // Match animation duration
        }
      }
    });
  }, [newlyReceivedCards]);

  const hasChanged = (dayIndex: number, time: MealTime): boolean => {
    if (!previousPlan) return false;
    const currentMeal = plan[dayIndex]?.meals[time];
    const prevMeal = previousPlan[dayIndex]?.meals[time];
    if (!currentMeal || !prevMeal) return false;
    return currentMeal.name !== prevMeal.name && currentMeal.name !== '';
  };

  const isEmpty = (dayIndex: number, time: MealTime): boolean => {
    const meal = plan[dayIndex]?.meals[time];
    return !meal || !meal.name || meal.name.trim() === '';
  };

  // Helper function to register card refs
  const registerCardRef = (cardKey: string, element: HTMLDivElement | null) => {
    if (element) {
      cardRefsRef.current.set(cardKey, element);
    } else {
      cardRefsRef.current.delete(cardKey);
    }
  };

  // Skeleton component for loading states
  const MealSkeleton: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => (
    <div className={`
      relative bg-white rounded-2xl p-5 shadow-sm border border-zinc-100
      min-h-[140px] xl:min-h-[160px] flex flex-col
      ${isLoading ? 'animate-pulse' : ''}
    `}>
      <div className="flex justify-between items-start mb-2">
        <div className="w-8 h-2 bg-zinc-200 rounded"></div>
        {isLoading && <Loader2 size={14} className="text-zinc-300 animate-spin" />}
      </div>

      <div className="flex-1">
        <div className="w-3/4 h-4 bg-zinc-200 rounded mb-2"></div>
        <div className="w-full h-3 bg-zinc-100 rounded mb-1"></div>
        <div className="w-2/3 h-3 bg-zinc-100 rounded"></div>
      </div>
    </div>
  );

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
                        const cell = dayPlan.meals[time] || { name: '', description: '', notes: '' };
                        const isChanged = hasChanged(dayIdx, time);
                        const isEmpty = !cell.name || cell.name.trim() === '';
                        const isLoadingThisMeal = isStreaming && isEmpty;
                        const cardKey = `${dayPlan.day}-${time}`;

                        // Show skeleton for empty meals during streaming
                        if (isLoadingThisMeal) {
                          return (
                            <MealSkeleton key={time} isLoading={true} />
                          );
                        }

                        return (
                             <div
                                key={time}
                                ref={(el) => registerCardRef(cardKey, el)}
                                onClick={() => onCellClick && onCellClick(dayPlan.day, time)}
                                className={`
                                  relative bg-white rounded-2xl p-5 shadow-sm border transition-all duration-500 active:scale-[0.98]
                                  ${isChanged
                                    ? 'border-indigo-100 bg-indigo-50/20'
                                    : 'border-zinc-100'}
                                `}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{time}</span>
                                  {isChanged && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}
                                </div>

                                <h4 className={`text-lg font-semibold mb-1 leading-snug ${isEmpty ? 'text-zinc-300 italic' : 'text-zinc-800'}`}>
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
                        const cell = dayPlan.meals[time] || { name: '', description: '', notes: '' };
                        const isChanged = hasChanged(dayIdx, time);
                        const isEmpty = !cell.name || cell.name.trim() === '';
                        const isLoadingThisMeal = isStreaming && isEmpty;
                        const cardKey = `${dayPlan.day}-${time}`;

                        // Show skeleton for empty meals during streaming
                        if (isLoadingThisMeal) {
                          return (
                            <MealSkeleton key={`${dayPlan.day}-${time}`} isLoading={true} />
                          );
                        }

                        return (
                            <div
                                key={`${dayPlan.day}-${time}`}
                                ref={(el) => registerCardRef(cardKey, el)}
                                onClick={() => onCellClick && onCellClick(dayPlan.day, time)}
                                className={`
                                    relative p-4 xl:p-5 bg-white rounded-2xl border transition-all duration-500 group
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
                                    {isChanged && <Sparkles size={14} className="text-indigo-400 animate-pulse" />}
                                </div>

                                <div className="flex-1">
                                    <h4 className={`font-bold text-sm xl:text-sm leading-snug mb-2 ${isEmpty ? 'text-zinc-300 italic' : 'text-zinc-800'}`}>
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
