import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { WeekPlan, MealTime } from '../types';
import { Users, Sparkles, ChevronRight, ChevronLeft, Loader2, RefreshCw, Sunrise, Sun, Cookie, Moon } from 'lucide-react';

interface MealGridProps {
  plan: WeekPlan;
  previousPlan?: WeekPlan;
  onCellClick?: (day: string, time: MealTime) => void;
  onReplaceMeal?: (day: string, time: MealTime) => void;
  isStreaming?: boolean;
  newlyReceivedCards?: Set<string>;
  replacingMeals?: Set<string>;
  isLocked?: boolean;
}

const MealGrid: React.FC<MealGridProps> = ({
  plan,
  previousPlan,
  onCellClick,
  onReplaceMeal,
  isStreaming = false,
  newlyReceivedCards = new Set(),
  replacingMeals = new Set(),
  isLocked = false,
}) => {
  const mealTimes = [MealTime.BREAKFAST, MealTime.LUNCH, MealTime.SNACK, MealTime.DINNER];

  // Helper functions for meal-type styling
  const getMealTypeClass = (time: MealTime): string => {
    switch (time) {
      case MealTime.BREAKFAST:
        return 'meal-card-breakfast';
      case MealTime.LUNCH:
        return 'meal-card-lunch';
      case MealTime.SNACK:
        return 'meal-card-snack';
      case MealTime.DINNER:
        return 'meal-card-dinner';
      default:
        return '';
    }
  };

  const getMealTypeDotClass = (time: MealTime): string => {
    switch (time) {
      case MealTime.BREAKFAST:
        return 'meal-type-dot-breakfast';
      case MealTime.LUNCH:
        return 'meal-type-dot-lunch';
      case MealTime.SNACK:
        return 'meal-type-dot-snack';
      case MealTime.DINNER:
        return 'meal-type-dot-dinner';
      default:
        return '';
    }
  };

  const getMealTypePillClass = (time: MealTime): string => {
    switch (time) {
      case MealTime.BREAKFAST:
        return 'meal-type-pill meal-type-pill-breakfast';
      case MealTime.LUNCH:
        return 'meal-type-pill meal-type-pill-lunch';
      case MealTime.SNACK:
        return 'meal-type-pill meal-type-pill-snack';
      case MealTime.DINNER:
        return 'meal-type-pill meal-type-pill-dinner';
      default:
        return '';
    }
  };

  const getMealTypeIcon = (time: MealTime) => {
    const iconProps = { size: 11, strokeWidth: 2.5 };
    switch (time) {
      case MealTime.BREAKFAST:
        return <Sunrise {...iconProps} />;
      case MealTime.LUNCH:
        return <Sun {...iconProps} />;
      case MealTime.SNACK:
        return <Cookie {...iconProps} />;
      case MealTime.DINNER:
        return <Moon {...iconProps} />;
      default:
        return null;
    }
  };

  // Use ref to track which cards have already been animated to prevent re-animation
  const animatedCardsRef = useRef<Set<string>>(new Set());
  const cardRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasInitialLoadCompleted = useRef(false);
  const hasAutoScrolled = useRef(false);
  const dayHeaderRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Helper function to get current meal time based on device time
  const getCurrentMealTime = (): MealTime => {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 5 && hour < 11) return MealTime.BREAKFAST;
    if (hour >= 11 && hour < 15) return MealTime.LUNCH;
    if (hour >= 15 && hour < 18) return MealTime.SNACK;
    return MealTime.DINNER;
  };

  // Helper function to get current day of week
  const getCurrentDay = (): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    return days[now.getDay()];
  };

  // Mark initial load as complete after first render with data
  useEffect(() => {
    const hasData = plan.some(day =>
      Object.values(day.meals).some(meal => meal.name && meal.name.trim() !== '')
    );

    if (hasData && !hasInitialLoadCompleted.current) {
      hasInitialLoadCompleted.current = true;
    }
  }, [plan]);

  // Auto-scroll to current meal on initial load - Apple-style: simple and direct
  useEffect(() => {
    if (!hasAutoScrolled.current && hasInitialLoadCompleted.current) {
      hasAutoScrolled.current = true;

      const currentDay = getCurrentDay();
      const currentMealTime = getCurrentMealTime();
      const cardKey = `${currentDay}-${currentMealTime}`;

      console.log('[Auto-scroll] Attempting to scroll to:', cardKey);

      // Calculate position using getBoundingClientRect for reliable positioning
      const attemptScroll = (retryCount = 0) => {
        let cardElement = cardRefsRef.current.get(cardKey);

        if (!cardElement) {
          console.log('[Auto-scroll] Card not found:', cardKey);
          if (retryCount < 3) {
            setTimeout(() => attemptScroll(retryCount + 1), 100);
          }
          return;
        }

        // Check if element is actually visible (has height)
        // If not, it's the hidden view - try to find the visible one
        if (cardElement.clientHeight === 0) {
          console.log('[Auto-scroll] Card has no height (hidden view), searching for visible card');

          // Search through all registered cards to find one with the same key that has height
          // This handles the case where both mobile and desktop views register the same key
          const allCards = Array.from(document.querySelectorAll('[class*="meal-card-dinner"]'));
          const visibleCard = allCards.find(el => {
            const htmlEl = el as HTMLElement;
            return htmlEl.clientHeight > 0;
          });

          if (visibleCard) {
            cardElement = visibleCard as HTMLDivElement;
            console.log('[Auto-scroll] Found visible card');
          } else {
            console.log('[Auto-scroll] No visible card found');
            return;
          }
        }

        // Find the scroll container
        let scrollContainer: HTMLElement | null = cardElement.parentElement;
        while (scrollContainer) {
          if (scrollContainer.classList.contains('overflow-y-auto')) {
            break;
          }
          scrollContainer = scrollContainer.parentElement;
        }

        if (!scrollContainer) {
          console.log('[Auto-scroll] No scroll container found');
          return;
        }

        console.log('[Auto-scroll] Found visible card and container');

        // Use getBoundingClientRect for reliable positioning
        const containerRect = scrollContainer.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();

        // Calculate position within scroll container
        // Add extra offset to account for sticky header (approximately 120px on mobile, 80px on desktop)
        const headerOffset = window.innerWidth < 768 ? 140 : 100;
        const relativePosition = scrollContainer.scrollTop + (cardRect.top - containerRect.top) - headerOffset;

        console.log('[Auto-scroll] Scrolling to:', relativePosition);

        // Set scroll position
        if (relativePosition > 0) {
          scrollContainer.scrollTop = relativePosition;
          console.log('[Auto-scroll] Scroll complete:', scrollContainer.scrollTop);
        } else {
          console.log('[Auto-scroll] Target at top, no scroll needed');
        }
      };

      // Wait for all data loading and layout to fully complete
      // Need a longer delay to ensure elements are in their final positions
      setTimeout(() => attemptScroll(0), 2000);
    }
  }, [hasInitialLoadCompleted]);

  // Reset on new plan generation
  useEffect(() => {
    if (isStreaming && plan.every(day =>
      Object.values(day.meals).every(meal => !meal.name || meal.name.trim() === '')
    )) {
      // This is a fresh plan generation, reset everything
      animatedCardsRef.current = new Set();
      cardRefsRef.current.clear();
      hasInitialLoadCompleted.current = false;
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

  // Helper function to register day header refs
  const registerDayHeaderRef = (day: string, element: HTMLDivElement | null) => {
    if (element) {
      dayHeaderRefsRef.current.set(day, element);
    } else {
      dayHeaderRefsRef.current.delete(day);
    }
  };

  // Skeleton component for loading states
  const MealSkeleton: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => (
    <div className="card relative min-h-[140px] xl:min-h-[160px] flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <div className="w-8 h-2 skeleton-shimmer rounded"></div>
        {isLoading && <Loader2 size={14} className="text-primary-300 animate-spin" />}
      </div>

      <div className="flex-1 space-y-2">
        <div className="w-3/4 h-4 skeleton-shimmer rounded"></div>
        <div className="w-full h-3 skeleton-shimmer rounded"></div>
        <div className="w-2/3 h-3 skeleton-shimmer rounded"></div>
      </div>
    </div>
  );

  // --- Mobile View (Apple-style sticky section headers) ---
  const MobileView = () => {
    return (
      <div className="md:hidden flex flex-col pb-20">
        {plan.map((dayPlan, dayIdx) => (
            <div key={dayPlan.day} className="mb-6">

                {/* Subtle Day Header */}
                <div
                  ref={(el) => registerDayHeaderRef(dayPlan.day, el)}
                  className="sticky-header-mobile"
                >
                    <h3 className="text-xs font-bold text-primary-500 uppercase tracking-[0.2em]">
                        {dayPlan.day}
                    </h3>
                </div>

                {/* Cards for that day */}
                <div className="space-y-3">
                    {mealTimes.map((time, timeIdx) => {
                        const cell = dayPlan.meals[time] || { name: '', description: '', notes: '' };
                        const isChanged = hasChanged(dayIdx, time);
                        const isEmpty = !cell.name || cell.name.trim() === '';
                        const isLoadingThisMeal = isStreaming && isEmpty;
                        const cardKey = `${dayPlan.day}-${time}`;
                        const staggerDelay = (dayIdx * 4 + timeIdx) * 40;

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
                                className={`
                                  ${!hasInitialLoadCompleted.current ? 'stagger-item' : ''} relative rounded-2xl p-5 shadow-sm border transition-all duration-500 active:scale-[0.98]
                                  ${getMealTypeClass(time)}
                                  ${isChanged ? 'ring-2 ring-indigo-200' : ''}
                                  ${replacingMeals.has(cardKey) ? 'opacity-60' : ''}
                                `}
                                style={{ animationDelay: !hasInitialLoadCompleted.current ? `${staggerDelay}ms` : '0ms' }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className={getMealTypePillClass(time)}>
                                    {getMealTypeIcon(time)}
                                    {time}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {isChanged && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}
                                    {!isEmpty && onReplaceMeal && !isLocked && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onReplaceMeal(dayPlan.day, time);
                                        }}
                                        disabled={replacingMeals.has(cardKey)}
                                        className="btn-icon-sm"
                                        aria-label="Replace meal"
                                      >
                                        <RefreshCw
                                          size={14}
                                          className={replacingMeals.has(cardKey) ? 'animate-spin-slow' : ''}
                                        />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <h4 className={`text-lg font-semibold mb-1 leading-snug ${isEmpty ? 'text-primary-300 italic' : 'text-primary-900'}`}>
                                  {cell.name || "Nothing planned"}
                                </h4>

                                {cell.description && (
                                  <p className="text-sm text-primary-500 leading-relaxed font-light line-clamp-2">
                                    {cell.description}
                                  </p>
                                )}

                                {cell.notes && (
                                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                                    style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)' }}
                                  >
                                    <Users size={12} className="text-primary-400" />
                                    <span className="text-[10px] font-medium text-primary-500">{cell.notes}</span>
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

        {/* Render each Day as a Row */}
        {plan.map((dayPlan, dayIdx) => (
            <div key={dayPlan.day} className="w-full">
                {/* Subtle Row Header */}
                <div
                  ref={(el) => registerDayHeaderRef(dayPlan.day, el)}
                  className="sticky-header-mobile"
                >
                    <span className="text-xs font-bold text-primary-500 uppercase tracking-[0.2em]">{dayPlan.day}</span>
                </div>

                {/* Adaptive Grid - Apple-like responsive behavior */}
                <div className="grid gap-4
                    grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
                    2xl:grid-cols-4">
                    {mealTimes.map((time, timeIdx) => {
                        const cell = dayPlan.meals[time] || { name: '', description: '', notes: '' };
                        const isChanged = hasChanged(dayIdx, time);
                        const isEmpty = !cell.name || cell.name.trim() === '';
                        const isLoadingThisMeal = isStreaming && isEmpty;
                        const cardKey = `${dayPlan.day}-${time}`;
                        const staggerDelay = (dayIdx * 4 + timeIdx) * 40;

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
                                className={`
                                    ${!hasInitialLoadCompleted.current ? 'stagger-item' : ''} relative p-4 xl:p-5 rounded-2xl border transition-all duration-500 group
                                    flex flex-col h-full min-h-[140px] xl:min-h-[160px]
                                    hover:-translate-y-1
                                    ${getMealTypeClass(time)}
                                    ${isChanged ? 'ring-2 ring-indigo-200' : ''}
                                    ${replacingMeals.has(cardKey) ? 'opacity-60' : ''}
                                `}
                                style={{ animationDelay: !hasInitialLoadCompleted.current ? `${staggerDelay}ms` : '0ms' }}
                            >
                                {/* Meal Time Label inside card for context */}
                                <div className="flex justify-between items-start mb-2">
                                    <span className={getMealTypePillClass(time)}>
                                      {getMealTypeIcon(time)}
                                      {time}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {isChanged && <Sparkles size={14} className="text-indigo-400 animate-pulse" />}
                                        {!isEmpty && onReplaceMeal && !isLocked && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onReplaceMeal(dayPlan.day, time);
                                            }}
                                            disabled={replacingMeals.has(cardKey)}
                                            className="btn-icon-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label="Replace meal"
                                          >
                                            <RefreshCw
                                              size={14}
                                              className={replacingMeals.has(cardKey) ? 'animate-spin-slow' : ''}
                                            />
                                          </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <h4 className={`font-bold text-base leading-snug mb-2 ${isEmpty ? 'text-primary-300 italic' : 'text-primary-900'}`}>
                                        {cell.name || "—"}
                                    </h4>
                                    {cell.description && (
                                        <p className="text-sm text-primary-500 font-light leading-relaxed line-clamp-2 xl:line-clamp-3">
                                            {cell.description}
                                        </p>
                                    )}
                                </div>

                                {cell.notes && (
                                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                        <div className="flex items-start gap-1.5">
                                            <Users size={12} className="text-primary-300 mt-0.5 shrink-0" />
                                            <span className="text-xs font-semibold text-primary-400 leading-tight">
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
