import React, { useState, useRef, useLayoutEffect } from 'react';
import { GroceryItem, WeekPlan } from '../types';
import { Check, ShoppingBag, Loader2, ArrowRight, Apple, Milk, Beef, Wheat, Package } from 'lucide-react';
import InvalidationBanner from './InvalidationBanner';
import RegenerateButton from './RegenerateButton';
import { resolveMealName } from '../utils/mealResolver';

// Category icon mapping - using filled Lucide icons with subtle color tints for distinction
const categoryIcons: Record<string, React.ReactNode> = {
  'Produce': <Apple size={16} strokeWidth={2} fill="currentColor" className="text-[#10b981]" />,
  'Dairy': <Milk size={16} strokeWidth={2} fill="currentColor" className="text-[#6366f1]" />,
  'Meat': <Beef size={16} strokeWidth={2} fill="currentColor" className="text-[#ef4444]" />,
  'Bakery': <Wheat size={16} strokeWidth={2} fill="currentColor" className="text-[#f59e0b]" />,
  'Pantry': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#8b5cf6]" />,
  'Seafood': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#06b6d4]" />,
  'Frozen': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#3b82f6]" />,
  'Beverages': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#ec4899]" />,
  'Snacks': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#f97316]" />,
};

interface GroceryListViewProps {
  items: GroceryItem[];
  mealPlan?: WeekPlan; // Add meal plan to resolve meal names
  onRegenerate: () => void;
  onGenerate: () => void;
  onNavigateToMealPlan: () => void;
  isLoading: boolean;
  hasMealPlan: boolean;
  newlyReceivedItems?: Set<string>;
  isInvalidated?: boolean; // New prop to show invalidation banner
  onItemsChange?: (items: GroceryItem[]) => void; // Callback to persist changes
}

const GroceryListView: React.FC<GroceryListViewProps> = ({
  items: initialItems,
  mealPlan,
  onRegenerate,
  onGenerate,
  onNavigateToMealPlan,
  isLoading,
  hasMealPlan,
  newlyReceivedItems = new Set(),
  isInvalidated = false,
  onItemsChange
}) => {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);

  // Use ref to track which items have already been animated
  const animatedItemsRef = useRef<Set<string>>(new Set());
  const itemRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Handle new items that should animate using direct DOM manipulation
  useLayoutEffect(() => {
    newlyReceivedItems.forEach(itemKey => {
      if (!animatedItemsRef.current.has(itemKey)) {
        animatedItemsRef.current.add(itemKey);

        // Find the item element and animate it directly
        const itemElement = itemRefsRef.current.get(itemKey);
        if (itemElement) {
          // Remove any existing animation classes
          itemElement.classList.remove('animate-fade-in-up', 'animate-stream-in');

          // Force a reflow to ensure the class removal takes effect
          itemElement.offsetHeight;

          // Add the animation class
          itemElement.classList.add('animate-stream-in');

          // Remove the animation class after it completes to prevent re-triggering
          setTimeout(() => {
            itemElement.classList.remove('animate-stream-in');
          }, 600); // Match animation duration
        }
      }
    });
  }, [newlyReceivedItems]);

  // Helper function to register item refs
  const registerItemRef = (itemKey: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefsRef.current.set(itemKey, element);
    } else {
      itemRefsRef.current.delete(itemKey);
    }
  };

  const toggleItem = (id: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);

    // Propagate changes to parent for persistence
    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  // Skeleton component for loading states
  const ItemSkeleton: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => (
    <div className={`
      group px-6 py-4 flex items-center justify-between cursor-pointer transition-all duration-200
    `}>
      <div className="flex items-center gap-4 flex-1">
        <div className="w-5 h-5 rounded-full skeleton-shimmer"></div>
        <div className="w-32 h-4 skeleton-shimmer rounded"></div>
      </div>
      <div className="w-16 h-3 skeleton-shimmer rounded"></div>
      {isLoading && <Loader2 size={14} className="text-zinc-300 animate-spin ml-2" />}
    </div>
  );

  if (isLoading && items.length === 0) {
    return (
      <div className="animate-fade-in">
        {/* Header - Desktop Only */}
        <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Shopping List</h2>
        </div>

        {/* Skeleton Loading State - Mobile */}
        <div className="md:hidden flex flex-col pb-20">
          <div className="mb-8">
            <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Produce</h3>
            </div>
            <div className="space-y-3 px-4">
              <div className="relative bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-zinc-200"></div>
                    <div className="w-24 h-4 bg-zinc-200 rounded"></div>
                  </div>
                  <div className="w-12 h-3 bg-zinc-100 rounded"></div>
                </div>
              </div>
              <div className="relative bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-zinc-200"></div>
                    <div className="w-32 h-4 bg-zinc-200 rounded"></div>
                  </div>
                  <div className="w-16 h-3 bg-zinc-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-8">
            <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Dairy</h3>
            </div>
            <div className="space-y-3 px-4">
              <div className="relative bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-zinc-200"></div>
                    <div className="w-20 h-4 bg-zinc-200 rounded"></div>
                  </div>
                  <div className="w-14 h-3 bg-zinc-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden md:block pb-20 max-w-4xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Produce</span>
              <div className="h-[1px] flex-1 bg-zinc-100"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="divide-y divide-zinc-50">
                <ItemSkeleton isLoading={true} />
                <ItemSkeleton isLoading={true} />
              </div>
            </div>
          </div>
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Dairy</span>
              <div className="h-[1px] flex-1 bg-zinc-100"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="divide-y divide-zinc-50">
                <ItemSkeleton isLoading={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-zinc-200">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-zinc-400 animate-pulse" />
            <span className="text-sm text-zinc-600 font-medium">Organizing your list...</span>
          </div>
        </div>
      </div>
    );
  }

  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <div className="animate-fade-in">

      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 max-w-4xl mx-auto px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Shopping List</h2>
        {items.length > 0 && !isInvalidated && (
          <RegenerateButton onRegenerate={onRegenerate} isLoading={isLoading} showText={true} />
        )}
      </div>

      {/* Mobile: Regenerate Button - Subtle, top-right corner */}
      {items.length > 0 && !isInvalidated && (
        <div className="md:hidden flex justify-end mb-4 px-4">
          <RegenerateButton onRegenerate={onRegenerate} isLoading={isLoading} showText={false} />
        </div>
      )}

      {/* Invalidation Banner */}
      {isInvalidated && items.length > 0 && (
        <div className="px-4 md:px-8 max-w-4xl mx-auto mb-6">
          <InvalidationBanner
            type="grocery"
            onRegenerate={onRegenerate}
            isLoading={isLoading}
            className="animate-fade-in"
          />
        </div>
      )}

      {items.length === 0 && !isLoading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center px-4">
          <div className="empty-state-icon-wrapper">
            <ShoppingBag size={32} className="text-zinc-400" />
          </div>

          {!hasMealPlan ? (
            <>
              <h3 className="text-lg font-semibold text-zinc-800 mb-2">Create Your Meal Plan First</h3>
              <p className="text-zinc-500 text-center mb-6 max-w-sm leading-relaxed">
                Your shopping list is generated from your weekly meal plan. Start by creating your meals for the week.
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
              <h3 className="text-lg font-semibold text-zinc-800 mb-2">No Shopping List Yet</h3>
              <p className="text-zinc-500 text-center mb-6 max-w-sm leading-relaxed">
                Generate a personalized shopping list based on your meal plan to make grocery shopping effortless.
              </p>
              <button
                onClick={onGenerate}
                disabled={isLoading}
                className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <ShoppingBag size={16} />
                Generate Shopping List
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col pb-20 px-4">
            {Object.entries(groupedItems).sort().map(([category, catItems]) => (
              <div key={category} className="mb-8">

                {/* Category Header - Apple-style section header */}
                <div className="sticky-header-mobile">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                      {category}
                    </h3>
                  </div>
                </div>

                {/* Items for that category */}
                <div className="space-y-3">
                  {catItems.map((item) => {
                    const itemKey = `${item.category}-${item.name}-${item.id}`;
                    return (
                    <div
                      key={item.id}
                      ref={(el) => registerItemRef(itemKey, el)}
                      onClick={() => toggleItem(item.id)}
                      className={`
                        relative bg-white rounded-2xl p-5 shadow-sm border transition-all active:scale-[0.98] cursor-pointer
                        ${item.checked ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-100'}
                      `}
                    >
                      <div className="flex gap-4">
                        <div className="mt-1">
                          <div className={`
                            checkbox-enhanced
                            ${item.checked ? 'checkbox-checked' : 'checkbox-unchecked'}
                          `}>
                            {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-lg font-semibold leading-snug transition-colors ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                              {item.name}
                            </span>
                            {item.quantity && (
                              <span className={`text-sm font-medium ml-3 ${item.checked ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                {item.quantity}
                              </span>
                            )}
                          </div>

                          {item.relatedMeals && Array.isArray(item.relatedMeals) && item.relatedMeals.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {item.relatedMeals.map((meal, idx) => {
                                const resolvedMealName = resolveMealName(meal, mealPlan);
                                return (
                                  <span key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${item.checked ? 'bg-zinc-50 border-zinc-100 text-zinc-400' : 'bg-zinc-50 border-zinc-100'}`}>
                                    <ArrowRight size={10} className="text-zinc-400" />
                                    <span className={`text-[10px] font-medium ${item.checked ? 'text-zinc-400' : 'text-zinc-500'}`}>{resolvedMealName}</span>
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

          {/* Desktop View - Grouped layout optimized for shopping lists */}
          <div className="hidden md:block pb-20 max-w-4xl mx-auto px-4 md:px-8">
            {Object.entries(groupedItems).sort().map(([category, catItems]) => (
              <div key={category} className="mb-8">

                {/* Category Header - Sticky */}
                <div className="sticky-header-mobile">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{category}</span>
                  </div>
                </div>

                {/* Grouped items in a clean card */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                  <div className="divide-y divide-zinc-50">
                    {catItems.map((item) => {
                      const itemKey = `${item.category}-${item.name}-${item.id}`;
                      return (
                      <div
                        key={item.id}
                        ref={(el) => registerItemRef(itemKey, el)}
                        onClick={() => toggleItem(item.id)}
                        className={`
                          group px-6 py-4 cursor-pointer transition-all duration-200
                          ${item.checked ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'}
                        `}
                      >
                        <div className="flex gap-4">
                          <div className="mt-1">
                            <div className={`
                              checkbox-enhanced
                              ${item.checked ? 'checkbox-checked' : 'checkbox-unchecked'}
                            `}>
                              {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-base font-medium transition-colors ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                                {item.name}
                              </span>
                              {item.quantity && (
                                <span className={`text-sm font-medium ml-3 ${item.checked ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                  {item.quantity}
                                </span>
                              )}
                            </div>

                            {item.relatedMeals && Array.isArray(item.relatedMeals) && item.relatedMeals.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.relatedMeals.map((meal, idx) => {
                                  const resolvedMealName = resolveMealName(meal, mealPlan);
                                  return (
                                    <span key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${item.checked ? 'bg-zinc-50 border-zinc-100 text-zinc-400' : 'bg-zinc-50 border-zinc-100'}`}>
                                      <ArrowRight size={10} className="text-zinc-400" />
                                      <span className={`text-[10px] font-medium ${item.checked ? 'text-zinc-400' : 'text-zinc-500'}`}>{resolvedMealName}</span>
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
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GroceryListView;
